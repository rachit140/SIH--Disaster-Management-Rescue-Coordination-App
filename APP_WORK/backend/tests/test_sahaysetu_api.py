"""SAHAYSETU backend test suite - covers auth, dashboard, incidents, map."""
import os
import uuid
import pytest
import requests

BASE = (os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL') or '').rstrip('/')
if not BASE:
    pytest.skip('EXPO_PUBLIC_BACKEND_URL missing', allow_module_level=True)
API = f'{BASE}/api'

SEED_EMAIL = 'arjun@sahaysetu.in'
SEED_PW = 'rescue123'


@pytest.fixture(scope='session')
def seed_token():
    r = requests.post(f'{API}/auth/login', json={'email': SEED_EMAIL, 'password': SEED_PW})
    assert r.status_code == 200, r.text
    return r.json()['access_token']


@pytest.fixture(scope='session')
def auth(seed_token):
    return {'Authorization': f'Bearer {seed_token}'}


# ---------- Health ----------
def test_health():
    r = requests.get(f'{API}/')
    assert r.status_code == 200
    assert r.json().get('status') == 'online'


# ---------- Auth ----------
def test_login_seed_returns_token_and_user():
    r = requests.post(f'{API}/auth/login', json={'email': SEED_EMAIL, 'password': SEED_PW})
    assert r.status_code == 200
    body = r.json()
    assert body['token_type'] == 'bearer' and body['access_token']
    u = body['user']
    assert u['email'] == SEED_EMAIL and u['role'] == 'coordinator' and u['verified'] is True


def test_login_wrong_password():
    r = requests.post(f'{API}/auth/login', json={'email': SEED_EMAIL, 'password': 'wrong-pass'})
    assert r.status_code == 401


def test_me_requires_bearer():
    r = requests.get(f'{API}/auth/me')
    assert r.status_code == 401


def test_me_invalid_token():
    r = requests.get(f'{API}/auth/me', headers={'Authorization': 'Bearer bogus.token'})
    assert r.status_code == 401


def test_me_ok(auth):
    r = requests.get(f'{API}/auth/me', headers=auth)
    assert r.status_code == 200
    assert r.json()['email'] == SEED_EMAIL


def test_register_verify_flow_and_duplicate():
    email = f'test_{uuid.uuid4().hex[:8]}@sahaysetu.in'
    r = requests.post(f'{API}/auth/register',
                      json={'name': 'TEST User', 'email': email, 'password': 'pw12345'})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body['email'] == email
    code = body.get('dev_code')
    assert code and len(code) == 6, 'DEV_RETURN_OTP should return dev_code'

    # Duplicate email -> 409
    r_dup = requests.post(f'{API}/auth/register',
                          json={'name': 'x', 'email': email, 'password': 'pw12345'})
    assert r_dup.status_code == 409

    # Bad OTP -> 400
    r_bad = requests.post(f'{API}/auth/verify-otp',
                          json={'email': email, 'code': '000000'})
    assert r_bad.status_code == 400

    # Correct OTP -> 200
    r_ok = requests.post(f'{API}/auth/verify-otp',
                         json={'email': email, 'code': code})
    assert r_ok.status_code == 200, r_ok.text
    j = r_ok.json()
    assert j['access_token'] and j['user']['email'] == email
    assert j['user']['verified'] is True


def test_forgot_and_reset_password():
    # Register a scratch user first
    email = f'reset_{uuid.uuid4().hex[:8]}@sahaysetu.in'
    reg = requests.post(f'{API}/auth/register',
                        json={'name': 'R', 'email': email, 'password': 'pw12345'}).json()
    # verify so account exists cleanly
    requests.post(f'{API}/auth/verify-otp', json={'email': email, 'code': reg['dev_code']})

    r = requests.post(f'{API}/auth/forgot-password', json={'email': email})
    assert r.status_code == 200
    code = r.json().get('dev_code')
    assert code, 'expected dev_code in reset response'

    # Wrong code -> 400
    bad = requests.post(f'{API}/auth/reset-password',
                        json={'email': email, 'code': '000000', 'new_password': 'newpw123'})
    assert bad.status_code == 400

    ok = requests.post(f'{API}/auth/reset-password',
                       json={'email': email, 'code': code, 'new_password': 'newpw123'})
    assert ok.status_code == 200

    # Login with new pw
    login = requests.post(f'{API}/auth/login', json={'email': email, 'password': 'newpw123'})
    assert login.status_code == 200


def test_gov_login_and_role_and_logout():
    gid = f'GOVIN-TEST-{uuid.uuid4().hex[:4].upper()}'
    r = requests.post(f'{API}/auth/gov-login', json={'gov_id': gid, 'name': 'TEST Officer'})
    assert r.status_code == 200
    body = r.json()
    tok = body['access_token']
    assert body['user']['provider'] == 'gov'

    # Set role
    rr = requests.post(f'{API}/auth/role', json={'role': 'volunteer'},
                       headers={'Authorization': f'Bearer {tok}'})
    assert rr.status_code == 200 and rr.json()['role'] == 'volunteer'

    # Logout returns 200
    lo = requests.post(f'{API}/auth/logout',
                       headers={'Authorization': f'Bearer {tok}'})
    assert lo.status_code == 200


# ---------- Dashboard ----------
def test_dashboard_summary_shape(auth):
    r = requests.get(f'{API}/dashboard/summary', headers=auth)
    assert r.status_code == 200
    d = r.json()
    for k in ('active_incidents', 'people_affected', 'volunteers_on_field', 'rescues_completed'):
        assert k in d['kpis'], f'missing kpi {k}'
        assert 'value' in d['kpis'][k]
    assert d['kpis']['active_incidents']['value'] == 12, 'seeded 12 active incidents expected'
    assert d['kpis']['volunteers_on_field']['value'] >= 823
    assert isinstance(d['recent_incidents'], list) and len(d['recent_incidents']) >= 1
    assert set(d['by_severity'].keys()) >= {'High', 'Medium', 'Low', 'Resolved'}


def test_dashboard_requires_auth():
    r = requests.get(f'{API}/dashboard/summary')
    assert r.status_code == 401


# ---------- Incidents ----------
def test_incidents_list_and_filters(auth):
    r = requests.get(f'{API}/incidents', headers=auth)
    assert r.status_code == 200
    all_inc = r.json()
    assert len(all_inc) >= 14

    r2 = requests.get(f'{API}/incidents', params={'severity': 'High'}, headers=auth)
    assert r2.status_code == 200
    assert all(i['severity'] == 'High' for i in r2.json())

    r3 = requests.get(f'{API}/incidents', params={'status': 'Resolved'}, headers=auth)
    assert r3.status_code == 200
    assert all(i['status'] == 'Resolved' for i in r3.json())

    r4 = requests.get(f'{API}/incidents', params={'search': 'Flood'}, headers=auth)
    assert r4.status_code == 200
    assert len(r4.json()) >= 1


def test_incident_detail_and_404(auth):
    r = requests.get(f'{API}/incidents/INC-1000', headers=auth)
    assert r.status_code == 200
    inc = r.json()
    assert inc['id'] == 'INC-1000'
    assert 'updates' in inc and isinstance(inc['updates'], list)

    miss = requests.get(f'{API}/incidents/INC-DOES-NOT-EXIST', headers=auth)
    assert miss.status_code == 404


def test_incident_patch_status_and_add_update(auth):
    # Use INC-1002 (active High fire) as a target - do NOT resolve INC-1000
    r = requests.patch(f'{API}/incidents/INC-1002',
                       json={'status': 'Monitoring'}, headers=auth)
    assert r.status_code == 200
    assert r.json()['status'] == 'Monitoring'

    # add update
    msg = f'TEST update {uuid.uuid4().hex[:6]}'
    r2 = requests.post(f'{API}/incidents/INC-1002/updates',
                       json={'message': msg, 'author': 'TEST'}, headers=auth)
    assert r2.status_code == 200
    updates = r2.json()['updates']
    assert any(u['message'] == msg for u in updates)

    # restore status back to Active
    requests.patch(f'{API}/incidents/INC-1002',
                   json={'status': 'Active'}, headers=auth)


# ---------- Map ----------
def test_map_markers(auth):
    r = requests.get(f'{API}/map/markers', headers=auth)
    assert r.status_code == 200
    d = r.json()
    for k in ('incidents', 'teams', 'shelters', 'hospitals', 'resources'):
        assert k in d and isinstance(d[k], list) and len(d[k]) > 0
    # sanity: lat/lng on each
    for t in d['teams']:
        assert 'latitude' in t and 'longitude' in t


# ---------- Data hygiene ----------
def test_no_mongo_id_leak(auth):
    for path, params in (('incidents', None), ('map/markers', None),
                         ('dashboard/summary', None)):
        r = requests.get(f'{API}/{path}', headers=auth, params=params)
        assert '_id' not in r.text, f'{path} leaks mongo _id'
