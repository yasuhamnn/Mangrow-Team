import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import AdminBottomNav from './AdminBottomNav'
import LoadingOverlay from '../components/LoadingOverlay'
import AdminVerifyListItem from './components/AdminVerifyListItem'
import AdminVerifyReportDetails from './components/AdminVerifyReportDetails'
import AdminVerifyResolutionDetails from './components/AdminVerifyResolutionDetails'
import { useBottomNavMetrics } from '../utils/shared/screenLayout'
import { getPendingReports, submitReportVerificationDecision } from '../utils/admin/adminVerifyReportsBackend'
import { getPendingResolutions } from '../utils/admin/adminVerifyResolutionsBackend'
import { startResolutionReview } from '../utils/admin/adminResolutionReviewBackend'

export default function AdminVerify() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics()
  const params = useLocalSearchParams()
  const reportIdParam = params?.reportId

  const [activeTab, setActiveTab] = useState('reports')
  const [reportItems, setReportItems] = useState([])
  const [resolutionItems, setResolutionItems] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isReportsTab = activeTab === 'reports'
  const currentItems = isReportsTab ? reportItems : resolutionItems
  const selectedItem = currentItems[selectedIndex] || null

  const refreshData = async () => {
    try {
      const [pending, resolutions] = await Promise.all([
        getPendingReports(),
        getPendingResolutions(),
      ])
      setReportItems(pending)
      setResolutionItems(resolutions)
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load verification queue.')
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    if (!reportIdParam) return

    const reportIdx = reportItems.findIndex((r) => r.id === reportIdParam)
    const resolutionIdx = resolutionItems.findIndex(
      (r) => r.id === reportIdParam || r.report_id === reportIdParam
    )

    if (reportIdx >= 0) {
      setActiveTab('reports')
      setSelectedIndex(reportIdx)
    } else if (resolutionIdx >= 0) {
      setActiveTab('resolutions')
      setSelectedIndex(resolutionIdx)
    }
  }, [reportIdParam, reportItems, resolutionItems])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedIndex(-1)
  }

  const onReportDecision = async (decision) => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      await submitReportVerificationDecision({
        reportId: selectedItem.id,
        decision,
      })
      await refreshData()
      setSelectedIndex(-1)
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to submit report decision.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onResolutionReview = async () => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      if (selectedItem.status === 'pending') {
        await startResolutionReview(selectedItem.id)
      }
      router.push({
        pathname: '/admin/admin_resolution_compare',
        params: { resolutionId: selectedItem.id },
      })
      setSelectedIndex(-1)
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to start resolution review.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onResolutionCompare = () => {
    if (!selectedItem) return
    router.push({
      pathname: '/admin/admin_resolution_compare',
      params: { resolutionId: selectedItem.id },
    })
  }

  const detailTitle = selectedIndex === -1
    ? 'Verification'
    : isReportsTab
      ? 'Report Details'
      : 'Resolution Details'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectedIndex !== -1 && (
            <TouchableOpacity onPress={() => setSelectedIndex(-1)}>
              <Ionicons name="arrow-back" size={22} color="rgb(16, 32, 15)" />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{detailTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-forward" size={18} color="rgb(16, 32, 15)" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPadding }]}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={isReportsTab ? styles.activeTab : styles.inactiveTab}
            onPress={() => handleTabChange('reports')}
            activeOpacity={0.7}
          >
            <Text style={isReportsTab ? styles.activeText : styles.inactiveText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={!isReportsTab ? styles.activeTab : styles.inactiveTab}
            onPress={() => handleTabChange('resolutions')}
            activeOpacity={0.7}
          >
            <Text style={!isReportsTab ? styles.activeText : styles.inactiveText}>Resolutions</Text>
          </TouchableOpacity>
        </View>

        {selectedIndex === -1 ? (
          <View style={styles.listContainer}>
            {currentItems.length === 0 ? (
              <Text style={styles.emptyText}>
                No {isReportsTab ? 'pending reports' : 'resolution submissions'} found.
              </Text>
            ) : (
              currentItems.map((item, idx) => (
                <AdminVerifyListItem
                  key={item.id}
                  item={{
                    ...item,
                    kind: isReportsTab ? 'report' : 'resolution',
                    image_url: isReportsTab ? item.image_url : (item.image_url || item.report?.image_url),
                  }}
                  onPress={() => setSelectedIndex(idx)}
                />
              ))
            )}
          </View>
        ) : isReportsTab ? (
          <AdminVerifyReportDetails
            report={selectedItem}
            isSubmitting={isSubmitting}
            onReject={() => router.push({
              pathname: '/admin/admin_reject_report',
              params: { reportId: selectedItem.id },
            })}
            onApprove={() => onReportDecision('approved')}
            onBack={() => setSelectedIndex(-1)}
          />
        ) : (
          <AdminVerifyResolutionDetails
            resolution={selectedItem}
            isSubmitting={isSubmitting}
            onReject={() => router.push({
              pathname: '/admin/admin_reject_resolution',
              params: { resolutionId: selectedItem.id },
            })}
            onReview={onResolutionReview}
            onCompare={onResolutionCompare}
            onBack={() => setSelectedIndex(-1)}
          />
        )}
      </ScrollView>

      <AdminBottomNav activeTab="verify" />
      <LoadingOverlay visible={isSubmitting} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 22,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgb(243, 244, 246)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  activeTab: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: 'rgb(0, 0, 0)',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeText: {
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(17, 24, 39)',
  },
  inactiveText: {
    color: 'rgb(107, 114, 128)',
    fontFamily: 'Montserrat_600SemiBold',
  },
  listContainer: {
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
  },
})
