import React from 'react'
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native'

const LoadingOverlay = ({ visible }) => {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="rgb(207, 239, 199)" />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default LoadingOverlay