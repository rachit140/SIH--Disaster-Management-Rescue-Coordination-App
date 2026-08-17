"""SAHAYSETU new modules test suite - survivors, volunteers, teams, resources, requests,
shelters, messages, alerts, reports, analytics, profile."""
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
def auth():
    r = requests.post(f'{API}/auth/login', json={'email': SEED_EMAIL, 'password': SEED_PW})
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _no_mongo_id(text):
    assert '"_id"' not in text, 'response leaks mongo _id'


# ---------- Survivors ----------
class TestSurvivors:
    def test_list_shape(self, auth):
        r = requests.get(f'{API}/survivors', headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert 'items' in d and 'counts' in d
        assert isinstance(d['items'], list) and len(d['items']) >= 1
        _no_mongo_id(r.text)

    def test_requires_auth(self):
        r = requests.get(f'{API}/survivors')
        assert r.status_code == 401

    def test_filter_status(self, auth):
        r = requests.get(f'{API}/survivors', params={'status': 'Pending'}, headers=auth)
        assert r.status_code == 200
        for s in r.json()['items']:
            assert s['status'] == 'Pending'

    def test_filter_priority(self, auth):
        r = requests.get(f'{API}/survivors', params={'priority': 'High'}, headers=auth)
        assert r.status_code == 200
        for s in r.json()['items']:
            assert s['priority'] == 'High'

    def test_search(self, auth):
        r = requests.get(f'{API}/survivors', headers=auth)
        items = r.json()['items']
        if items:
            name = items[0]['name'].split()[0]
            r2 = requests.get(f'{API}/survivors', params={'search': name}, headers=auth)
            assert r2.status_code == 200
            assert len(r2.json()['items']) >= 1

    def test_create(self, auth):
        payload = {'name': f'TEST_Survivor_{uuid.uuid4().hex[:6]}',
                   'age': 33, 'location': 'TEST Zone', 'contact': '+911234567890',
                   'emergency_type': 'Flood', 'priority': 'High'}
        r = requests.post(f'{API}/survivors', json=payload, headers=auth)
        assert r.status_code in (200, 201), r.text
        assert r.json()['name'] == payload['name']
        # verify persistence
        r2 = requests.get(f'{API}/survivors', params={'search': payload['name']}, headers=auth)
        assert any(s['name'] == payload['name'] for s in r2.json()['items'])


# ---------- Volunteers ----------
class TestVolunteers:
    def test_list(self, auth):
        r = requests.get(f'{API}/volunteers', headers=auth)
        assert r.status_code == 200
        d = r.json()
        assert 'items' in d and 'counts' in d
        assert len(d['items']) >= 1
        _no_mongo_id(r.text)

    def test_auth(self):
        assert requests.get(f'{API}/volunteers').status_code == 401


# ---------- Teams ----------
class TestTeams:
    def test_enriched(self, auth):
        r = requests.get(f'{API}/teams', headers=auth)
        assert r.status_code == 200
        teams = r.json()
        assert isinstance(teams, list) and len(teams) >= 1
        sample = teams[0]
        # Enriched fields
        for k in ('leader', 'team_status', 'current_mission', 'resources'):
            assert k in sample, f'missing {k}'
        _no_mongo_id(r.text)


# ---------- Resources ----------
class TestResources:
    def test_list_and_fields(self, auth):
        r = requests.get(f'{API}/resources', headers=auth)
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1
        for k in ('available', 'allocated', 'status'):
            assert k in items[0], f'missing {k}'
        _no_mongo_id(r.text)

    def test_filter_category(self, auth):
        r = requests.get(f'{API}/resources', headers=auth)
        cats = {x.get('category') for x in r.json() if x.get('category')}
        if cats:
            cat = next(iter(cats))
            r2 = requests.get(f'{API}/resources', params={'category': cat}, headers=auth)
            assert r2.status_code == 200
            assert all(x['category'] == cat for x in r2.json())


# ---------- Resource Requests ----------
class TestRequests:
    def test_list(self, auth):
        r = requests.get(f'{API}/requests', headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        _no_mongo_id(r.text)

    def test_create_and_advance(self, auth):
        # need a resource id
        payload = {'resource_type': 'Drinking Water', 'quantity': 5,
                   'location': 'TEST_loc', 'priority': 'High'}
        r = requests.post(f'{API}/requests', json=payload, headers=auth)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        assert created.get('status') == 'Pending'
        req_id = created['id']
        # advance
        r2 = requests.patch(f'{API}/requests/{req_id}', json={'status': 'Approved'}, headers=auth)
        assert r2.status_code == 200
        assert r2.json()['status'] == 'Approved'


# ---------- Shelters ----------
class TestShelters:
    def test_list(self, auth):
        r = requests.get(f'{API}/shelters', headers=auth)
        assert r.status_code == 200
        shelters = r.json()
        assert len(shelters) >= 1
        for k in ('status', 'medical', 'food', 'water'):
            assert k in shelters[0], f'missing {k}'
        _no_mongo_id(r.text)


# ---------- Messages ----------
class TestMessages:
    def test_conversations(self, auth):
        r = requests.get(f'{API}/conversations', headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        _no_mongo_id(r.text)

    def test_thread_and_post(self, auth):
        convs = requests.get(f'{API}/conversations', headers=auth).json()
        if not convs:
            pytest.skip('no conversations seeded')
        cid = convs[0]['id']
        r = requests.get(f'{API}/conversations/{cid}/messages', headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        text = f'TEST_msg_{uuid.uuid4().hex[:5]}'
        r2 = requests.post(f'{API}/conversations/{cid}/messages',
                           json={'text': text}, headers=auth)
        assert r2.status_code in (200, 201), r2.text
        # verify appended
        r3 = requests.get(f'{API}/conversations/{cid}/messages', headers=auth)
        assert any(m.get('text') == text for m in r3.json())


# ---------- Alerts ----------
class TestAlerts:
    def test_list(self, auth):
        r = requests.get(f'{API}/alerts', headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 1
        _no_mongo_id(r.text)

    def test_patch(self, auth):
        alerts = requests.get(f'{API}/alerts', headers=auth).json()
        if not alerts:
            pytest.skip('no alerts')
        aid = alerts[0]['id']
        r = requests.patch(f'{API}/alerts/{aid}', json={'status': 'Acknowledged'}, headers=auth)
        assert r.status_code == 200
        assert r.json()['status'] == 'Acknowledged'


# ---------- Reports ----------
class TestReports:
    def test_list(self, auth):
        r = requests.get(f'{API}/reports', headers=auth)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        _no_mongo_id(r.text)


# ---------- Analytics ----------
class TestAnalytics:
    def test_datasets(self, auth):
        r = requests.get(f'{API}/analytics', params={'range': '7d'}, headers=auth)
        assert r.status_code == 200
        d = r.json()
        # 8 datasets expected
        assert isinstance(d, dict)
        assert len(d.keys()) >= 6, f'only {list(d.keys())}'


# ---------- Profile ----------
class TestProfile:
    def test_get(self, auth):
        r = requests.get(f'{API}/auth/profile', headers=auth)
        assert r.status_code == 200
        u = r.json()
        assert u['email'] == SEED_EMAIL
        _no_mongo_id(r.text)

    def test_patch(self, auth):
        payload = {'name': 'Arjun (TEST)', 'phone': '+919999900000',
                   'organization': 'NDRF TEST', 'location': 'Delhi TEST'}
        r = requests.patch(f'{API}/auth/profile', json=payload, headers=auth)
        assert r.status_code == 200, r.text
        # verify persistence via GET (PATCH response only returns public_user fields)
        r2 = requests.get(f'{API}/auth/profile', headers=auth)
        u2 = r2.json()
        for k, v in payload.items():
            assert u2.get(k) == v, f'{k} not persisted: {u2.get(k)}'
        # restore
        requests.patch(f'{API}/auth/profile',
                       json={'name': 'Arjun Coordinator'}, headers=auth)


# ---------- Auth guard on all new endpoints ----------
@pytest.mark.parametrize('path', [
    'survivors', 'volunteers', 'teams', 'resources', 'requests',
    'shelters', 'conversations', 'alerts', 'reports',
    'analytics', 'auth/profile',
])
def test_401_without_token(path):
    r = requests.get(f'{API}/{path}')
    assert r.status_code == 401, f'{path} should require auth, got {r.status_code}'
