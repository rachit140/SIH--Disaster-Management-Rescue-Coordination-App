import React from 'react';
import { View, Text, StyleSheet, Linking, Pressable, Platform } from 'react-native';
import { useTheme } from '@/src/theme/ThemeContext';

export const Footer = () => {
  const { c } = useTheme();
  const repoUrl = 'https://github.com/yourusername/yourrepo';
  const openRepo = () => {
    Linking.openURL(repoUrl).catch(err => console.warn('Failed to open URL', err));
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.card, borderTopColor: c.divider },
        Platform.OS === 'web' ? { position: 'fixed' as any, bottom: 0, left: 0, right: 0, zIndex: 10 } : {},
      ]}
    >
      <Pressable onPress={openRepo} accessibilityLabel="GitHub Repository Link">
        <Text style={[styles.link, { color: c.text }]}>© 2026 SAHAYSETU – Repo</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  link: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
