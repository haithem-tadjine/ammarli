import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DriverInfo } from '../../src/store/useCustomerStore';

// ── Constants ──────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#002147',
  secondary: '#FFCC00',
  white: '#FFFFFF',
  textSecondary: '#8E8E93',
  callBlue: '#1E88E5',
  successGreen: '#16A34A',
  successBg: '#F0FDF4',
};

// ── Props ──────────────────────────────────────────────────────────────────
interface DriverInfoCardProps {
  driverInfo?: DriverInfo;
  price?: number;
}

// ── Component ──────────────────────────────────────────────────────────────
const DriverInfoCard = ({ driverInfo, price }: DriverInfoCardProps) => {
  const driverName  = driverInfo?.name  ?? 'جاري البحث...';
  const phoneNumber = driverInfo?.phone ?? '';
  const truckPlate  = driverInfo?.plate ?? '---';
  const driverRating = driverInfo?.rating ?? '---';

  const handleCallPress = () => {
    if (phoneNumber) Linking.openURL(`tel:${phoneNumber}`);
  };

  return (
    <View style={styles.driverCard}>
      {/* Call Button */}
      <TouchableOpacity
        style={[styles.callButton, !phoneNumber && styles.callButtonDisabled]}
        onPress={handleCallPress}
        disabled={!phoneNumber}
      >
        <Ionicons name="call" size={22} color={COLORS.white} />
        <Text style={styles.callButtonText}>اتصال</Text>
      </TouchableOpacity>

      {/* Driver Info */}
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{driverName}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>{driverRating}</Text>
          <Ionicons name="star" size={14} color={COLORS.secondary} />
        </View>
        <Text style={styles.plateText}>رقم اللوحة: {truckPlate}</Text>
        {price != null && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              السعر النهائي: {price.toLocaleString('ar-DZ')} د.ج
            </Text>
          </View>
        )}
      </View>

      {/* Avatar */}
      {driverInfo?.avatarUrl ? (
        <Image source={{ uri: driverInfo.avatarUrl }} style={styles.driverAvatar} />
      ) : (
        <View style={[styles.driverAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={30} color={COLORS.white} />
        </View>
      )}
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  driverCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F2F2F7',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 15,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  plateText: {
    fontSize: 13,
    fontFamily: 'Cairo-SemiBold',
    color: COLORS.textSecondary,
  },
  priceBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: COLORS.successGreen,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Cairo-Bold',
    color: COLORS.successGreen,
  },
  callButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.callBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 3,
    shadowColor: COLORS.callBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  callButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    shadowOpacity: 0,
  },
  callButtonText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: 'Cairo-Bold',
    marginTop: 4,
  },
});

export default DriverInfoCard;
