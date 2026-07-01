import React, { useMemo, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import ImageViewerModal from './ImageViewerModal'

export default function AdminVerifyResolutionDetails({
  resolution,
  isSubmitting,
  onReject,
  onReview,
  onCompare,
  onBack,
}) {
  const [viewingImage, setViewingImage] = useState(false)
  const [viewingIndex, setViewingIndex] = useState(0)

  const report = resolution?.report

  const allImages = useMemo(() => {
    const images = []
    if (resolution?.image_url) images.push(resolution.image_url)
    if (report?.image_url) images.push(report.image_url)
    report?.attachments?.forEach((att) => {
      if (att.image_url) images.push(att.image_url)
    })
    return images
  }, [resolution, report])

  if (!resolution) return null

  const isInReview = resolution.status === 'under_review'
  const previewImage = resolution.image_url || report?.image_url

  return (
    <>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.resolutionPill}>
            <Text style={styles.resolutionPillText}>Resolution submission</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.heroWrap}
          activeOpacity={0.9}
          onPress={() => { if (allImages.length) { setViewingIndex(0); setViewingImage(true) } }}
        >
          <Image
            source={previewImage ? { uri: previewImage } : require('../../../assets/mangroves_carousel_1.webp')}
            style={styles.heroImage}
          />
        </TouchableOpacity>

        <Text style={styles.speciesName}>{resolution.species || 'Mangrove Report'}</Text>

        <View style={styles.infoGrid}>
          <View style={[styles.infoPill, styles.fullWidth]}>
            <Ionicons name="location-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>{resolution.formatted_address || 'Location'}</Text>
          </View>

          <View style={[styles.infoPill, styles.fullWidth]}>
            {resolution.volunteer_avatar ? (
              <Image source={{ uri: resolution.volunteer_avatar }} style={styles.volunteerAvatar} />
            ) : (
              <View style={styles.volunteerAvatarPlaceholder}>
                <Ionicons name="person" size={14} color="rgb(107, 114, 128)" />
              </View>
            )}
            <Text style={styles.infoText}>{resolution.volunteer_name || 'Volunteer'}</Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="calendar-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>
              {resolution.created_at ? String(resolution.created_at).slice(0, 10) : '—'}
            </Text>
          </View>

          <View style={styles.infoPill}>
            <Ionicons name="document-text-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>Report #{String(resolution.report_id || '').slice(0, 8)}</Text>
          </View>
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Resolution notes</Text>
          <Text style={styles.notesText}>
            {resolution.notes || 'No resolution notes provided.'}
          </Text>
        </View>

        {report?.field_notes ? (
          <View style={styles.originalNotesBox}>
            <Text style={styles.notesTitle}>Original field notes</Text>
            <Text style={styles.notesText}>{report.field_notes}</Text>
          </View>
        ) : null}

        <Text style={styles.coordinates}>
          Resolution coordinates: {resolution.latitude ?? report?.latitude}, {resolution.longitude ?? report?.longitude}
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
          style={isInReview ? styles.approveButton : styles.reviewButton}
          activeOpacity={0.85}
          onPress={isInReview ? onCompare : onReview}
          disabled={isSubmitting}
        >
          <Feather name={isInReview ? 'check' : 'eye'} size={16} color={isInReview ? 'rgb(201, 138, 0)' : 'rgb(37, 99, 235)'} />
          <Text style={[styles.approveText, !isInReview && styles.reviewText]}>
            {isInReview ? 'Compare & Resolve' : 'Review'}
          </Text>
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
  badgeRow: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  resolutionPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(255, 242, 217)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  resolutionPillText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(201, 138, 0)',
  },
  heroWrap: {
    marginTop: 10,
    width: '100%',
    height: 220,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  notesBox: {
    marginTop: 16,
    marginHorizontal: 18,
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 15,
    padding: 16,
  },
  originalNotesBox: {
    marginTop: 12,
    marginHorizontal: 18,
    backgroundColor: 'rgb(247, 252, 242)',
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
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewButton: {
    width: '46%',
    height: 40,
    backgroundColor: 'rgb(232, 241, 255)',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    marginLeft: 8,
    color: 'rgb(255, 77, 79)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  approveText: {
    marginLeft: 8,
    color: 'rgb(201, 138, 0)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  reviewText: {
    color: 'rgb(37, 99, 235)',
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
