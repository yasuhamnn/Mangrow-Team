import React, { useCallback, useEffect, useState } from 'react'
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
import { usePullToRefresh } from '../utils/shared/usePullToRefresh'
import ScreenHeader, { HeaderBackButton } from '../components/ScreenHeader'
import {
  getPendingReports,
  submitReportVerificationDecision,
  getApprovedReportsForReview,
  revertReportApproval,
} from '../utils/admin/adminVerifyReportsBackend'
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
  const [approvedItems, setApprovedItems] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isReportsTab = activeTab === 'reports'
  const isApprovedTab = activeTab === 'approved'
  const currentItems = isReportsTab
    ? reportItems
    : isApprovedTab
      ? approvedItems
      : resolutionItems
  const selectedItem = currentItems[selectedIndex] || null

  const refreshData = useCallback(async () => {
    try {
      const [pending, resolutions, approved] = await Promise.all([
        getPendingReports(),
        getPendingResolutions(),
        getApprovedReportsForReview(),
      ])
      setReportItems(pending)
      setResolutionItems(resolutions)
      setApprovedItems(approved)
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load verification queue.')
    }
  }, [])

  const { refreshControl } = usePullToRefresh(refreshData)

  useEffect(() => {
    refreshData()
  }, [refreshData])

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

  const performRevert = async (reportId) => {
    setIsSubmitting(true)
    try {
      await revertReportApproval(reportId)
      await refreshData()
      setSelectedIndex(-1)
      Alert.alert('Approval reverted', 'The report was moved back to the pending queue for re-review.')
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to revert approval.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onRevertApproval = (item) => {
    const report = item || selectedItem
    if (!report) return
    Alert.alert(
      'Revert this approval?',
      'This report was approved by mistake. Reverting removes it from the public map and returns it to the pending queue for re-review.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Revert', style: 'destructive', onPress: () => performRevert(report.id) },
      ]
    )
  }

  const detailTitle = selectedIndex === -1
    ? 'Verification'
    : isReportsTab
      ? 'Report Details'
      : isApprovedTab
        ? 'Approved Report'
        : 'Resolution Details'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={detailTitle}
        leading={
          selectedIndex !== -1 ? (
            <HeaderBackButton onPress={() => setSelectedIndex(-1)} />
          ) : null
        }
        right={<HeaderBackButton onPress={() => router.back()} icon="arrow-forward" />}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPadding }]}
        refreshControl={refreshControl}
      >
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={activeTab === 'reports' ? styles.activeTab : styles.inactiveTab}
            onPress={() => handleTabChange('reports')}
            activeOpacity={0.7}
          >
            <Text style={activeTab === 'reports' ? styles.activeText : styles.inactiveText}>Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={activeTab === 'resolutions' ? styles.activeTab : styles.inactiveTab}
            onPress={() => handleTabChange('resolutions')}
            activeOpacity={0.7}
          >
            <Text style={activeTab === 'resolutions' ? styles.activeText : styles.inactiveText}>Resolutions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={activeTab === 'approved' ? styles.activeTab : styles.inactiveTab}
            onPress={() => handleTabChange('approved')}
            activeOpacity={0.7}
          >
            <Text style={activeTab === 'approved' ? styles.activeText : styles.inactiveText}>Approved</Text>
          </TouchableOpacity>
        </View>

        {selectedIndex === -1 ? (
          <View style={styles.listContainer}>
            {currentItems.length === 0 ? (
              <Text style={styles.emptyText}>
                {isReportsTab
                  ? 'No pending reports found.'
                  : isApprovedTab
                    ? 'No approved reports to review.'
                    : 'No resolution submissions found.'}
              </Text>
            ) : isApprovedTab ? (
              currentItems.map((item, idx) => (
                <View key={item.id} style={styles.approvedRow}>
                  <AdminVerifyListItem
                    item={{ ...item, kind: 'report', image_url: item.image_url }}
                    onPress={() => setSelectedIndex(idx)}
                  />
                  <TouchableOpacity
                    style={styles.revertButton}
                    activeOpacity={0.85}
                    onPress={() => onRevertApproval(item)}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="arrow-undo-outline" size={15} color="rgb(201, 138, 0)" />
                    <Text style={styles.revertButtonText}>Revert approval (approved by mistake)</Text>
                  </TouchableOpacity>
                </View>
              ))
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
        ) : isApprovedTab ? (
          <AdminVerifyReportDetails
            report={selectedItem}
            isSubmitting={isSubmitting}
            hideDecisionButtons
            onRevert={() => onRevertApproval(selectedItem)}
            onBack={() => setSelectedIndex(-1)}
          />
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
  approvedRow: {
    gap: 8,
  },
  revertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgb(255, 242, 217)',
    borderWidth: 1,
    borderColor: 'rgb(245, 217, 168)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  revertButtonText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(138, 90, 0)',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
  },
})
