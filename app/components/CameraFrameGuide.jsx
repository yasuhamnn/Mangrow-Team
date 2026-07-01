import { StyleSheet, Text, View } from 'react-native'

export default function CameraFrameGuide({ label, variant = 'tall' }) {
  const frameStyle = variant === 'square' ? styles.frameSquare : styles.frameTall

  return (
    <View style={[styles.wrapper, frameStyle]} pointerEvents="none">
      <View style={styles.frameOuter} />
      {label ? <Text style={styles.frameText}>{label}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
  },
  frameOuter: {
    width: '100%',
    height: '100%',
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 25,
  },
  frameTall: {
    top: '30%',
    width: '88%',
    height: '60%',
  },
  frameSquare: {
    top: '32%',
    width: '72%',
    aspectRatio: 1,
  },
  frameText: {
    marginTop: 12,
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
})
