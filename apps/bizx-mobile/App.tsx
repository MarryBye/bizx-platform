import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  StyleSheet
} from 'react-native';
import './global.css';

import { useMobileAuthStore } from './src/store/useMobileAuthStore';
import { useMobileStoresStore } from './src/store/useMobileStoresStore';
import { useCartStore } from './src/store/useCartStore';

import { StoresScreen } from './src/screens/StoresScreen';
import { StoreDetailScreen } from './src/screens/StoreDetailScreen';
import { CartScreen } from './src/screens/CartScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import type { Store } from '@bizx/common-types';

type TabType = 'stores' | 'cart' | 'orders' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('stores');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const { init } = useMobileAuthStore();
  const { fetchInitialData, selectStore } = useMobileStoresStore();
  const { getTotalCount } = useCartStore();

  useEffect(() => {
    void init();
    void fetchInitialData();
  }, [init, fetchInitialData]);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    void selectStore(store);
  };

  const handleBackFromStore = () => {
    setSelectedStore(null);
    void selectStore(null);
  };

  const handleGoToCart = () => {
    setSelectedStore(null);
    setActiveTab('cart');
  };

  const cartItemCount = getTotalCount();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeTab === 'stores' && (
          selectedStore ? (
            <StoreDetailScreen
              store={selectedStore}
              onBack={handleBackFromStore}
              onGoToCart={handleGoToCart}
            />
          ) : (
            <StoresScreen onSelectStore={handleSelectStore} />
          )
        )}

        {activeTab === 'cart' && (
          <CartScreen
            onGoToStores={() => setActiveTab('stores')}
            onGoToOrders={() => setActiveTab('orders')}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersScreen onGoToProfile={() => setActiveTab('profile')} />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen />
        )}
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
          <Text style={styles.tabIcon}>🏪</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'stores' && styles.tabLabelActive
            ]}
          >
            Магазини
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('cart')}
        >
          <View style={styles.cartIconWrapper}>
            <Text style={styles.tabIcon}>🛒</Text>
            {cartItemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'cart' && styles.tabLabelActive
            ]}
          >
            Кошик
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={styles.tabIcon}>📦</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'orders' && styles.tabLabelActive
            ]}
          >
            Замовлення
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          activeOpacity={0.7}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.tabLabelActive
            ]}
          >
            Профіль
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
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
  tabIcon: {
    fontSize: 20
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500'
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '700'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  }
});
