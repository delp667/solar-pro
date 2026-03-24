import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { companies } from '../data/companies';
import { colors, spacing, radius, typography } from '../theme';

export default function CompanySelectionScreen({ navigation }) {
  const handleSelectCompany = (company) => {
    navigation.navigate('ServiceType', { company });
  };

  const renderCompanyCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectCompany(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '18' }]}>
          <Text style={styles.icon}>{item.icon}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.companyName}>{item.name}</Text>
          <Text style={styles.serviceCount}>{item.services.length} שירותים זמינים</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </View>
      <View style={[styles.colorBar, { backgroundColor: item.color }]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>בחר חברה</Text>
        <Text style={styles.headerSubtitle}>לאיזו חברה תרצה להתקשר?</Text>
      </View>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanyCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'right',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  cardText: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'flex-end',
  },
  companyName: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'right',
  },
  serviceCount: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  arrow: {
    marginLeft: spacing.sm,
  },
  arrowText: {
    fontSize: 24,
    color: colors.textLight,
    transform: [{ scaleX: -1 }],
  },
  colorBar: {
    height: 3,
    width: '100%',
  },
});
