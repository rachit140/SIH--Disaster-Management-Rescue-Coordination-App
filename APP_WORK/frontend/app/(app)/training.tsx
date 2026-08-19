import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/src/theme/ThemeContext";
import { Card, Button } from "@/src/components/ui";
import { ProgressBar } from "@/src/components/charts";
import { useResponsive } from "@/src/hooks/useResponsive";

interface Course {
  id: string;
  title: string;
  category: string;
  duration: string;
  progress: number;
  status: "Completed" | "In Progress" | "Enrolled";
  icon: string;
  desc: string;
}

const MOCK_COURSES: Course[] = [
  { id: "TRN-01", title: "Flood & Swift Water Rescue", category: "Field Ops", duration: "4 hrs", progress: 100, status: "Completed", icon: "water-outline", desc: "Essential protocols for rescuing survivors from swift currents and flooded residential zones." },
  { id: "TRN-02", title: "First Aid & CPR Refresher", category: "Medical", duration: "2 hrs", progress: 100, status: "Completed", icon: "medkit-outline", desc: "Cardiopulmonary resuscitation, tourniquet application, and basic life support drill." },
  { id: "TRN-03", title: "P2P Mesh Network Operations", category: "Communications", duration: "3 hrs", progress: 65, status: "In Progress", icon: "git-network-outline", desc: "Setting up store-carry-forward gateway nodes and linking local mesh routers offline." },
  { id: "TRN-04", title: "Disaster Command Center Administration", category: "Management", duration: "6 hrs", progress: 0, status: "Enrolled", icon: "desktop-outline", desc: "Simulate incident allocation, resource logistics mapping, and volunteer dispatching." },
];

export default function Training() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive(1000);
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES);

  const handleStartCourse = (id: string) => {
    setCourses(
      courses.map((course) => {
        if (course.id === id) {
          if (course.status === "Enrolled") {
            return { ...course, status: "In Progress", progress: 10 };
          } else if (course.status === "In Progress") {
            return { ...course, progress: Math.min(course.progress + 25, 100), status: course.progress + 25 >= 100 ? "Completed" : "In Progress" };
          }
        }
        return course;
      })
    );
  };

  const completedCount = courses.filter((c) => c.status === "Completed").length;
  const inProgressCount = courses.filter((c) => c.status === "In Progress").length;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} testID="training-screen">
      <View>
        <Text style={[styles.title, { color: c.text }]}>Responder Training & Drills</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Complete simulations and courses to maintain active deployment credentials.</Text>
      </View>

      {/* Progress Cards Overview */}
      <View style={styles.statsRow}>
        <Card style={{ flexBasis: 180, flexGrow: 1, gap: 8 }}>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Simulation Drills Completed</Text>
          <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>{completedCount} / {courses.length}</Text>
          <ProgressBar progress={completedCount / courses.length} color={c.green} />
        </Card>

        <Card style={{ flexBasis: 180, flexGrow: 1, gap: 8 }}>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: "600" }}>Active Training Modules</Text>
          <Text style={{ color: c.text, fontSize: 32, fontWeight: "900" }}>{inProgressCount}</Text>
          <ProgressBar progress={courses.length > 0 ? inProgressCount / courses.length : 0} color={c.blue} />
        </Card>
      </View>

      {/* Course Grid */}
      <Text style={{ color: c.text, fontSize: 18, fontWeight: "800", marginTop: 12 }}>Available Training Modules</Text>

      <View style={[styles.grid, { flexDirection: isDesktop ? "row" : "column" }]}>
        {courses.map((course) => {
          const statusCol = course.status === "Completed" ? c.green : course.status === "In Progress" ? c.blue : c.textMuted;
          const statusBg = course.status === "Completed" ? c.greenSoft : course.status === "In Progress" ? c.blueSoft : c.divider;

          return (
            <Card key={course.id} testID={`course-${course.id}`} style={[styles.courseCard, { flexBasis: isDesktop ? "48%" : "100%" }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: c.blueSoft }]}>
                  <Ionicons name={course.icon as any} size={24} color={c.blue} />
                </View>
                <View style={styles.headerInfo}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={[styles.category, { color: c.blue }]}>{course.category}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={{ color: statusCol, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{course.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.courseTitle, { color: c.text }]} numberOfLines={1}>{course.title}</Text>
                </View>
              </View>

              <Text style={[styles.desc, { color: c.textMuted }]} numberOfLines={3}>{course.desc}</Text>

              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={16} color={c.textMuted} />
                <Text style={{ color: c.textMuted, fontSize: 13 }}>Duration: {course.duration}</Text>
              </View>

              {/* Progress Tracker */}
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>Course Progress</Text>
                  <Text style={{ color: c.text, fontSize: 12, fontWeight: "700" }}>{course.progress}%</Text>
                </View>
                <ProgressBar progress={course.progress / 100} color={course.progress === 100 ? c.green : c.blue} />
              </View>

              <View style={{ marginTop: 6 }}>
                {course.status === "Completed" ? (
                  <Button
                    title="Review Module"
                    onPress={() => handleStartCourse(course.id)}
                    variant="outline"
                    icon="checkmark-done"
                  />
                ) : (
                  <Button
                    title={course.status === "In Progress" ? "Resume Simulation" : "Enroll & Start"}
                    onPress={() => handleStartCourse(course.id)}
                    variant={course.status === "In Progress" ? "primary" : "soft"}
                    icon={course.status === "In Progress" ? "play" : "book"}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, gap: 18, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  courseCard: { padding: 20, gap: 14, flexGrow: 1 },
  cardHeader: { flexDirection: "row", gap: 14 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, gap: 2 },
  category: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  courseTitle: { fontSize: 16, fontWeight: "800", marginTop: 2 },
  desc: { fontSize: 13, lineHeight: 18 },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
