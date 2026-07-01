import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../supabaseClient';
import { getUserRole } from './utils/userService';

export default function Index() {
  const [rootLoading, setRootLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        try {
          const userRole = await getUserRole(session.user.id);
          setRole(userRole);
        } catch {
          setRole('volunteer');
        }
      }

      setRootLoading(false);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        try {
          const userRole = await getUserRole(session.user.id);
          setRole(userRole);
        } catch {
          setRole('volunteer');
        }
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (rootLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/Sign_In" />;
  }

  if (role === 'admin') {
    return <Redirect href="/admin/admin_dashboard" />;
  }

  return <Redirect href="/dashboard" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgb(251, 252, 247)' },
});
