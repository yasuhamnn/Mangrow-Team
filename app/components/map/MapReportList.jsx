import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import AdaptiveLocationText from '../AdaptiveLocationText'
import { getStatusLabel } from '../../utils/shared/reportQuery'
import { LIST_FILTERS } from './mapConstants'

function MapReportCard({ report, onPress }) {
  return (
    <TouchableOpacity
      style={styles.reportCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image
        source={
          report.image_url ? { uri: report.image_url }
            : report.image_uri ? { uri: report.image_uri }
              : require('../../../assets/mangroves_carousel_1.webp')
        }
        style={styles.reportImage}
      />

      <View style={styles.reportContent}>
        <View style={styles.reportHeader}>
          <Text style={styles.speciesText}>{report.species || 'Unknown Species'}</Text>
          <View style={[
            styles.statusBadge,
            report.status === 'resolved' ? styles.resolvedBadge
              : report.status === 'under_review' ? styles.activeBadge
                : styles.reviewBadge,
          ]}>
            <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
          </View>
        </View>

        <AdaptiveLocationText
          text={report.formatted_address || 'Unknown location'}
          color="rgb(123, 129, 119)"
          style={{ marginTop: 1 }}
        />

        <View style={styles.reportFooter}>
          <View style={styles.healthRow}>
            <View style={[
              styles.healthIndicator,
              { backgroundColor: report.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
            ]} />
            <Text style={[
              styles.healthText,
              { color: report.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
            ]}>{report.health_status || 'unhealthy'}</Text>
          </View>
        </View>

        {report.status === 'under_review' && (
          <>
            <View style={styles.actionSeparator} />
            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.7}
              onPress={onPress}
            >
              <Text style={styles.actionText}>View details →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function MapReportList({
  activeFilter,
  onFilterChange,
  filteredReports,
  isLoading,
  scrollPadding,
  onListLayout,
}) {
  const router = useRouter()

  const openReport = (id) => {
    router.push({ pathname: '/report_details', params: { id } })
  }

  return (
    <>
      <View
        style={styles.stickyRowContainer}
        onLayout={onListLayout}
      >
        <View style={styles.stickyRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
            style={{ flex: 1 }}
          >
            {LIST_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, activeFilter === filter && styles.activeChip]}
                onPress={() => onFilterChange(filter)}
              >
                <Text style={[styles.filterChipText, activeFilter === filter && styles.activeChipText]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.reportContainer, { paddingBottom: scrollPadding }]}>
        {isLoading && filteredReports.length === 0 ? (
          <Text style={styles.emptyListText}>Loading reports...</Text>
        ) : filteredReports.length === 0 ? (
          <Text style={styles.emptyListText}>No reports match this filter.</Text>
        ) : (
          filteredReports.map((report) => (
            <MapReportCard
              key={report.id}
              report={report}
              onPress={() => openReport(report.id)}
            />
          ))
        )}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  stickyRowContainer: {
    backgroundColor: 'rgb(251, 252, 247)',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(240, 242, 232)',
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  filterContainer: {
    paddingVertical: 4,
    paddingRight: 10,
  },
  filterChip: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: 'rgb(244, 246, 241)',
    borderWidth: 1,
    borderColor: 'rgb(217, 222, 209)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  activeChip: {
    backgroundColor: 'rgb(61, 170, 43)',
    borderColor: 'rgb(61, 170, 43)',
  },
  filterChipText: {
    fontSize: 11,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_600SemiBold',
  },
  activeChipText: {
    color: 'rgb(255, 255, 255)',
  },
  reportContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  emptyListText: {
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
    marginTop: 12,
    marginBottom: 20,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 12,
    marginBottom: 10,
  },
  reportImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgb(243, 244, 246)',
  },
  reportContent: {
    flex: 1,
    marginLeft: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  speciesText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: { backgroundColor: 'rgb(255, 231, 231)' },
  resolvedBadge: { backgroundColor: 'rgb(221, 243, 214)' },
  reviewBadge: { backgroundColor: 'rgb(255, 242, 217)' },
  statusText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(16, 32, 15)',
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  actionSeparator: {
    height: 1,
    backgroundColor: 'rgb(232, 236, 221)',
    marginVertical: 8,
  },
  actionButton: {
    alignSelf: 'flex-end',
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(61, 170, 43)',
  },
})
