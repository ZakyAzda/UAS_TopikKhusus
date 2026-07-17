import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

import { useCheckout } from '@/components/checkout/useCheckout';
import AddressSection from '@/components/checkout/AddressSection';
import OrderSummary from '@/components/checkout/OrderSummary';
import PaymentSection from '@/components/checkout/PaymentSection';
import SuccessModal from '@/components/checkout/SuccessModal';
import MidtransWebView from '@/components/payment/MidtransWebView';
import PendingPaymentModal from '@/components/payment/PendingPaymentModal';
import { checkoutStyles as S } from '@/components/checkout/checkout.styles';
import { CheckoutParams } from '@/components/checkout/checkout.types';

export default function CheckoutScreen() {
  const router = useRouter();
  const { C, brand, scheme } = useTheme();
  const params = useLocalSearchParams<CheckoutParams>();

  const rawTotal = params.total;
  const subtotal = rawTotal
    ? Number(Array.isArray(rawTotal) ? rawTotal[0] : rawTotal)
    : 0;

  const checkout = useCheckout(params);

  return (
    <SafeAreaView style={[S.container, { backgroundColor: C.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[S.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[S.backBtn, { backgroundColor: C.surfaceAlt }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: C.text }]}>Checkout</Text>
        <View style={S.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={S.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AddressSection
            C={C} brand={brand}
            savedAddresses={checkout.savedAddresses}
            selectedAddressId={checkout.selectedAddressId}
            showAddressForm={checkout.showAddressForm}
            editingAddress={checkout.editingAddress}
            formLabel={checkout.formLabel}
            formDetail={checkout.formDetail}
            formLat={checkout.formLat}
            formLng={checkout.formLng}
            onSelectAddress={checkout.setSelectedAddressId}
            onOpenAddForm={checkout.openAddForm}
            onOpenEditForm={checkout.openEditForm}
            onDeleteAddress={checkout.deleteAddress}
            onSaveAddress={checkout.saveAddress}
            onCloseForm={checkout.closeForm}
            onChangeLabel={checkout.setFormLabel}
            onChangeDetail={checkout.setFormDetail}
            onSetMapCoords={checkout.setMapCoords}
          />

          <OrderSummary
            C={C} brand={brand}
            subtotal={subtotal}
            shippingCost={0}
          />

          <PaymentSection
            C={C} brand={brand}
            selected={checkout.payMethod}
            onSelect={checkout.setPayMethod}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Bar */}
      <View style={[S.bottomBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[
            S.submitBtn,
            { backgroundColor: brand.primary, shadowColor: brand.primary },
            checkout.loading && { opacity: 0.7 },
          ]}
          onPress={checkout.submitCheckout}
          disabled={checkout.loading}
          activeOpacity={0.85}
        >
          {checkout.loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={S.submitBtnText}>
                {checkout.payMethod === 'COD' ? 'Buat Pesanan' : 'Lanjut ke Pembayaran'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Midtrans WebView Popup */}
      {checkout.snapToken !== '' && (
        <MidtransWebView
          visible={checkout.showMidtrans}
          snapToken={checkout.snapToken}
          onResult={checkout.handleMidtransResult}
          brand={brand}
          C={C}
        />
      )}

      {/* ✅ Pending / Close / Error Modal */}
      <PendingPaymentModal
        visible={checkout.showPendingModal}
        type={checkout.pendingModalType}
        errorMessage={checkout.pendingErrorMessage}
        onPayAgain={checkout.handlePayAgain}
        onViewOrder={checkout.handleViewOrder}
        onContinueShopping={checkout.handleContinueShopping}
      />

      {/* Success Modal (COD & Transfer sukses) */}
      <SuccessModal
        visible={checkout.showSuccess}
        payMethod={checkout.payMethod}
        onViewOrder={checkout.handleViewOrder}
        onContinueShopping={checkout.handleContinueShopping}
      />
    </SafeAreaView>
  );
}