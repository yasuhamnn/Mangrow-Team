import React, { useMemo, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import ImageViewerModal from './ImageViewerModal'

export default function AdminVerifyReportDetails({
  report,
  isSubmitting,
  onReject,
  onApprove,
  onBack,
}) {
  const [viewingImage, setViewingImage] = useState(false)
  const [viewingIndex, setViewingIndex] = useState(0)

  const allImages = useMemo(
    () => [report?.image_url, ...(report?.attachments?.map((a) => a.image_url) || [])].filter(Boolean),
    [report]
  )

  if (!report) return null

  return (
    <>
      <View style={styles.card}>
        <View style={styles.imageGallery}>
          <TouchableOpacity
            style={styles.mainImageWrap}
            activeOpacity={0.9}
            onPress={() => { setViewingIndex(0); setViewingImage(true) }}
          >
            <Image
              source={report.image_url ? { uri: report.image_url } : require('../../../assets/mangroves_carousel_1.webp')}
              style={styles.mainImage}
            />
          </TouchableOpacity>

          {report.attachments?.length > 0 && (
            <View style={styles.thumbColumn}>
              {report.attachments.slice(0, 2).map((att, i) => {
                const isLast = i === 1 && report.attachments.length > 2
                return (
                  <TouchableOpacity
                    key={att.id || i}
                    style={styles.thumbWrap}
                    activeOpacity={0.9}
                    onPress={() => { setViewingIndex(i + 1); setViewingImage(true) }}
                  >
                    <Image source={{ uri: att.image_url }} style={styles.thumbImage} />
                    {isLast && (
                      <View style={styles.plusBadge}>
                        <Text style={styles.plusBadgeText}>+{report.attachments.length - 2}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        <Text style={styles.speciesName}>{report.species || 'Unknown Species'}</Text>

        <View style={styles.infoGrid}>
          <View style={[styles.infoPill, styles.fullWidth]}>
            <Ionicons name="location-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>{report.formatted_address || 'Location'}</Text>
          </View>

          <View style={[styles.infoPill, styles.fullWidth]}>
            {report.volunteer_avatar ? (
              <Image source={{ uri: report.volunteer_avatar }} style={styles.volunteerAvatar} />
            ) : (
              <View style={styles.volunteerAvatarPlaceholder}>
                <Ionicons name="person" size={14} color="rgb(107, 114, 128)" />
              </View>
            )}
            <Text style={styles.infoText}>{report.volunteer_name || 'Volunteer'}</Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="calendar-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>
              {report.captured_at ? String(report.captured_at).slice(0, 10) : '—'}
            </Text>
          </View>

          <View style={styles.infoPill}>
            <View style={styles.healthDot} />
            <Text style={styles.unhealthyText}>{report.health_status || 'Unhealthy'}</Text>
          </View>
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Field notes</Text>
          <Text style={styles.notesText}>
            {report.field_notes || report.notes || 'No notes provided.'}
          </Text>
        </View>

        <Text style={styles.coordinates}>
          Coordinates: {report.latitude}, {report.longitude}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.rejectButton}
          activeOpacity={0.85}
          onPress={onReject}
          disabled={isSubmitting}
        >
          <Feather name="x" size={16} color="rgb(255, 77, 79)" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.approveButton}
          activeOpacity={0.85}
          onPress={onApprove}
          disabled={isSubmitting}
        >
          <Feather name="check" size={16} color="rgb(255, 255, 255)" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backToListBtn} onPress={onBack}>
        <Text style={styles.backToListText}>← Back to list</Text>
      </TouchableOpacity>

      <ImageViewerModal
        visible={viewingImage}
        images={allImages}
        index={viewingIndex}
        onClose={() => setViewingImage(false)}
        onIndexChange={setViewingIndex}
      />
    </>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
  },
  imageGallery: {
    flexDirection: 'row',
    width: '100%',
    height: 240,
    gap: 2,
  },
  mainImageWrap: { flex: 2 },
  mainImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbColumn: { flex: 1, gap: 2 },
  thumbWrap: { flex: 1, position: 'relative' },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  plusBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusBadgeText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
  },
  speciesName: {
    marginTop: 8,
    marginHorizontal: 18,
    fontSize: 24,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  infoGrid: {
    marginTop: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  infoPill: {
    width: '48%',
    backgroundColor: 'rgb(247, 252, 242)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullWidth: { width: '100%' },
  infoText: {
    marginLeft: 8,
    color: 'rgb(16, 32, 15)',
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    flex: 1,
  },
  volunteerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 4,
  },
  volunteerAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgb(229, 231, 235)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgb(255, 59, 48)',
    marginLeft: 2,
    marginRight: 8,
  },
  unhealthyText: {
    color: 'rgb(255, 59, 48)',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
  notesBox: {
    marginTop: 16,
    marginHorizontal: 18,
    backgroundColor: 'rgb(221, 243, 214)',
    borderRadius: 15,
    padding: 16,
  },
  notesTitle: {
    fontSize: 14,
    color: 'rgb(16, 32, 15)',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_400Regular',
  },
  coordinates: {
    marginTop: 14,
    marginBottom: 20,
    marginHorizontal: 18,
    color: 'rgb(123, 128, 121)',
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  rejectButton: {
    width: '46%',
    height: 40,
    backgroundColor: 'rgb(247, 230, 230)',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    width: '46%',
    height: 40,
    backgroundColor: 'rgb(55, 165, 36)',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgb(55, 165, 36)',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  rejectText: {
    marginLeft: 8,
    color: 'rgb(255, 77, 79)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  approveText: {
    marginLeft: 8,
    color: 'rgb(255, 255, 255)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  backToListBtn: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 10,
  },
  backToListText: {
    color: 'rgb(107, 114, 128)',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
})
