import React from 'react'
import { StyleSheet, View } from 'react-native'

const Leaf = ({ style, rotate = '0deg', scale = 1, flip = false }) => (
  <View
    style={[
      styles.leaf,
      {
        transform: [{ rotate }, { scaleX: flip ? -1 : 1 }, { scale }],
      },
      style,
    ]}
  >
    <View style={styles.vein} />
  </View>
)

const LeafCluster = ({ style, flip = false }) => (
  <View style={[styles.cluster, style]}>
    <Leaf flip={flip} rotate={flip ? '-18deg' : '18deg'} style={styles.leafOne} />
    <Leaf
      flip={flip}
      rotate={flip ? '18deg' : '-18deg'}
      style={styles.leafTwo}
      scale={0.94}
    />
    <Leaf
      flip={flip}
      rotate={flip ? '-54deg' : '54deg'}
      style={styles.leafThree}
      scale={0.82}
    />
  </View>
)

export default function AuthBackground({ children, style }) {
  return (
    <View style={[styles.background, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LeafCluster style={styles.topLeft} flip />
        <LeafCluster style={styles.topRight} flip />
      </View>

      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    overflow: 'hidden',
  },

  cluster: {
    position: 'absolute',
    width: 132,
    height: 112,
  },

  topLeft: {
    top: 126,
    left: -80,
    transform: [{ scaleX: -1 }],
  },

  topRight: {
    top: 126,
    right: -78,
  },
  leaf: {
    position: 'absolute',
    width: 50,
    height: 46,
    borderTopLeftRadius: 44,
    borderBottomRightRadius: 44,
    backgroundColor: 'rgb(117, 201, 20)',
    // shadow properties removed to eliminate the shadow
  },

  leafOne: {
    top: 8,
    left: 26,
  },

  leafTwo: {
    top: 42,
    left: 48,
  },

  leafThree: {
    top: 46,
    left: 4,
    backgroundColor: 'rgb(207, 239, 199)',
  },

  vein: {
    position: 'absolute',
    top: 20,
    left: 15,
    width: 30,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(25, 100, 24, 0.38)',
    transform: [{ rotate: '135deg' }],
  },
})

