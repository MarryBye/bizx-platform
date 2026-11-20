import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialIcon } from './src/components/MaterialIcon';
import './global.css';

import { useMobileAuthStore } from './src/store/useMobileAuthStore';
import { useMobileStoresStore } from './src/store/useMobileStoresStore';
import { useCartStore } from './src/store/useCartStore';

import { StoresScreen } from './src/screens/StoresScreen';
import { StoreDetailScreen } from './src/screens/StoreDetailScreen';
import { CartScreen } from './src/screens/CartScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { OrderDetailScreen } from './src/screens/OrderDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { mobileApi } from './src/lib/api';
import { useMobileTranslation } from './src/hooks/useMobileTranslation';
import { formatCompactCount, type Store } from '@bizx/common-types';

type TabType = 'stores' | 'cart' | 'orders' | 'profile';

export default function App() {
  const { t } = useMobileTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('stores');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [inboxUnreadCount, setInboxUnreadCount] = useState<number>(0);

  const { user, isInitialized, init } = useMobileAuthStore();
  const {
    fetchInitialData,
    selectStore,
    fetchMyOrders,
    fetchUnreadSummary,
    unreadMessagesCount,
    pendingRefundOffersCount
  } = useMobileStoresStore();
  const { items } = useCartStore();

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const ordersBadgeCount = unreadMessagesCount + pendingRefundOffersCount;

  useEffect(() => {
    void init();
    void fetchInitialData();
  }, [init, fetchInitialData]);

  useEffect(() => {
    if (!user) {
      setInboxUnreadCount(0);
      return;
    }
    const loadInboxSummary = () => {
      mobileApi.inbox
        .getUnreadSummary()
        .then((res) => {
          if (res.success && res.data) {
            setInboxUnreadCount(res.data.totalUnreadMessages || 0);
          }
        })
        .catch(() => {});
    };
    void fetchUnreadSummary();
    loadInboxSummary();
    const timer = setInterval(() => {
      void fetchUnreadSummary();
      loadInboxSummary();
    }, 15000);
    return () => clearInterval(timer);
  }, [user, fetchUnreadSummary]);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    void selectStore(store);
  };

  const handleBackToStores = () => {
    setSelectedStore(null);
  };

  const handleOrderUpdated = useCallback(() => {
    void fetchMyOrders();
    void fetchUnreadSummary();
  }, [fetchMyOrders, fetchUnreadSummary]);

  const shell = (children: React.ReactNode) => (
    <View style={Platform.OS === 'web' ? styles.webBackdrop : styles.nativeBackdrop}>
      <SafeAreaView style={[styles.container, Platform.OS === 'web' && styles.webShell]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        {children}
      </SafeAreaView>
    </View>
  );

  if (!isInitialized) {
    return shell(
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ marginTop: 12, fontSize: 12, fontWeight: '700', color: '#64748b' }}>
          Завантаження BizX...
        </Text>
      </View>
    );
  }

  if (!user) {
    return shell(<AuthScreen />);
  }

  return shell(
    <>
      {/* Main Content View */}
      <View style={styles.content}>
        {activeTab === 'stores' &&
          (selectedStore ? (
            <StoreDetailScreen
              store={selectedStore}
              onBack={handleBackToStores}
              onGoToCart={() => setActiveTab('cart')}
            />
          ) : (
            <StoresScreen onSelectStore={handleSelectStore} />
          ))}

        {activeTab === 'cart' && (
          <CartScreen
            onContinueShopping={() => {
              setActiveTab('stores');
              setSelectedStore(null);
            }}
            onOrderSuccess={() => {
              setSelectedOrderId(null);
              setActiveTab('orders');
              void fetchMyOrders();
            }}
          />
        )}

        {activeTab === 'orders' &&
          (selectedOrderId ? (
            <OrderDetailScreen
              orderId={selectedOrderId}
              onBack={() => {
                setSelectedOrderId(null);
                handleOrderUpdated();
              }}
              onOrderUpdated={handleOrderUpdated}
            />
          ) : (
            <OrdersScreen
              onExploreStores={() => {
                setActiveTab('stores');
                setSelectedStore(null);
              }}
              onSelectOrder={(order) => setSelectedOrderId(order.id)}
            />
          ))}

        {activeTab === 'profile' && <ProfileScreen />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedStore(null);
            setActiveTab('stores');
          }}
        >
          <MaterialIcon
            name="storefront"
            size={22}
            color={activeTab === 'stores' ? '#0f172a' : '#64748b'}
          />
          <Text style={[styles.tabLabel, activeTab === 'stores' && styles.tabLabelActive]}>
            {t('mobile.tabStores')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('cart')}
        >
          <View style={styles.cartIconWrapper}>
            <MaterialIcon
              name="shopping-cart"
              size={22}
              color={activeTab === 'cart' ? '#0f172a' : '#64748b'}
            />
            {cartItemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {formatCompactCount(cartItemCount)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'cart' && styles.tabLabelActive]}>
            {t('mobile.tabCart')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedOrderId(null);
            setActiveTab('orders');
          }}
        >
          <View style={styles.cartIconWrapper}>
            <MaterialIcon
              name="receipt-long"
              size={22}
              color={activeTab === 'orders' ? '#0f172a' : '#64748b'}
            />
            {ordersBadgeCount > 0 && (
              <View style={[styles.badge, styles.badgeBlue]}>
                <Text style={styles.badgeText}>
                  {formatCompactCount(ordersBadgeCount)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'orders' && styles.tabLabelActive]}>
            {t('mobile.tabOrders')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('profile')}
        >
          <View style={styles.cartIconWrapper}>
            <MaterialIcon
              name="person-outline"
              size={22}
              color={activeTab === 'profile' ? '#0f172a' : '#64748b'}
            />
            {inboxUnreadCount > 0 && (
              <View style={[styles.badge, styles.badgeBlue]}>
                <Text style={styles.badgeText}>
                  {formatCompactCount(inboxUnreadCount)}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            {t('mobile.tabProfile')}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  nativeBackdrop: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  webBackdrop: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ffffff'
  },
  webShell: {
    maxWidth: 960,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  cartIconWrapper: {
    position: 'relative'
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500'
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '700'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeBlue: {
    backgroundColor: '#2563eb'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  }
});
