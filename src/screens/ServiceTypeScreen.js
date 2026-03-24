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
import { colors, spacing, radius, typography } from '../theme';

const serviceIcons = {
  internet: '🌐',
  phone: '📞',
  billing: '💳',
  technical: '🔧',
  cancellation: '❌',
  tv: '📺',
  upgrade: '⬆️',
  mobile: '📱',
  outage: '⚡',
  connection: '🔌',
  meter: '📊',
  account: '🏦',
  loans: '💰',
  cards: '💳',
  investments: '📈',
  mortgage: '🏠',
};

function WaitBadge({ minutes, companyColor }) {
  const level = minutes <= 8 ? 'low' : minutes <= 15 ? 'medium' : 'high';
  const badgeColors = {
    low: { bg: '#D1FAE5', text: '#065F46' },
    medium: { bg: '#FEF3C7', text: '#92400E' },
    high: { bg: '#FEE2E2', text: '#991B1B' },
  };
  const label = {
    low: 'המתנה קצרה',
    medium: 'המתנה בינונית',
    high: 'המתנה ארוכה',
  };

  return (
    <View style={[styles.waitBadge, { backgroundColor: badgeColors[level].bg }]}>
      <Text style={[styles.waitBadgeText, { color: badgeColors[level].text }]}>
        {label[level]} · {minutes} דק׳
      </Text>
    </View>
  );
}

export default function ServiceTypeScreen({ route, navigation }) {
  const { company } = route.params;

  const handleSelectService = (service) => {
    navigation.navigate('Waiting', { company, service });
  };

  const renderServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleSelectService(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: company.color + '18' }]}>
          <Text style={styles.icon}>{serviceIcons[item.id] || '📋'}</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.serviceName}>{item.name}</Text>
          <WaitBadge minutes={item.estimatedWait} companyColor={company.color} />
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.header}>
        <View style={[styles.companyBadge, { backgroundColor: company.color + '18' }]}>
          <Text style={styles.companyIcon}>{company.icon}</Text>
          <Text style={[styles.companyName, { color: company.color }]}>{company.name}</Text>
        </View>
        <Text style={styles.headerTitle}>בחר סוג שירות</Text>
        <Text style={styles.headerSubtitle}>על מה תרצה לדבר עם נציג?</Text>
      </View>
      <FlatList
        data={company.services}
        keyExtractor={(item) => item.id}
        renderItem={renderServiceCard}
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
  companyBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  companyIcon: {
    fontSize: 18,
    marginLeft: spacing.xs,
  },
  companyName: {
    ...typography.bodyMedium,
    textAlign: 'right',
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
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  cardText: {
    flex: 1,
    marginRight: spacing.md,
    alignItems: 'flex-end',
  },
  serviceName: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  waitBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  waitBadgeText: {
    ...typography.caption,
    fontWeight: '500',
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
});
