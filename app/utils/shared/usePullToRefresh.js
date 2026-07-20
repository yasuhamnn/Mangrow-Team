import { useCallback, useMemo, useState } from 'react'
import { RefreshControl } from 'react-native'

export const MANGROW_REFRESH_COLOR = 'rgb(109, 170, 26)'

export function usePullToRefresh(onRefreshFn) {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefreshFn()
    } catch {
      // keep existing content when refresh fails
    } finally {
      setRefreshing(false)
    }
  }, [onRefreshFn])

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[MANGROW_REFRESH_COLOR]}
        tintColor={MANGROW_REFRESH_COLOR}
      />
    ),
    [refreshing, onRefresh]
  )

  return { refreshing, onRefresh, refreshControl }
}
