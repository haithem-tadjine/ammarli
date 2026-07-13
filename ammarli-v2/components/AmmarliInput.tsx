import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary:       '#003366',
  secondary:     '#F3CD0D',
  white:         '#FFFFFF',
  inputBg:       '#F1F5F9',
  textSecondary: '#64748B',
  border:        '#E2E8F0',
  error:         '#E53935',
  success:       '#10B981',
};

export interface AmmarliInputProps extends TextInputProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  error?: string;
  isValid?: boolean;
  isPassword?: boolean;
}

const AmmarliInput = forwardRef<TextInput, AmmarliInputProps>((props, ref) => {
  const { label, iconName, error, isValid, isPassword, ...textInputProps } = props;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputContainer, !!error && styles.inputError]}>
        {/* Right Side (Start in RTL): Main Icon */}
        <Ionicons name={iconName} size={20} color={COLORS.primary} style={styles.mainIcon} />
        
        {/* Left Side: Eye Icon */}
        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          style={[styles.input, (isPassword && !showPassword) && { fontFamily: undefined }]}
          placeholderTextColor="#94A3B8"
          textAlign="right"
          {...textInputProps}
          secureTextEntry={isPassword ? !showPassword : textInputProps.secureTextEntry}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

export default AmmarliInput;
AmmarliInput.displayName = 'AmmarliInput';

const styles = StyleSheet.create({
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontFamily: 'Cairo-Bold', fontSize: 14, color: COLORS.primary, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', height: 60, backgroundColor: COLORS.inputBg, borderRadius: 16, alignItems: 'center', paddingHorizontal: 15 },
  inputError: { borderWidth: 1, borderColor: COLORS.error },
  input: { flex: 1, fontFamily: 'Cairo-Regular', fontSize: 16, color: COLORS.primary, textAlign: 'left' },
  mainIcon: { marginEnd: 10 },
  eyeIcon: { padding: 5, marginStart: 10 },
  errorText: { fontFamily: 'Cairo-Regular', fontSize: 12, color: COLORS.error, marginTop: 4 },
});
