import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Image,
  StatusBar,
  Animated,
  FlatList,
  Keyboard,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useCustomerStore } from '../../src/store/useCustomerStore';

import MapView from '../../components/Map';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primaryBlue: '#003366',
  accentYellow: '#F3CD0D',
  white: '#FFFFFF',
  textDark: '#333333',
  gray: '#8E8E93',
  background: '#F8F9FA'
};

export default function InteractiveLocationPicker() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userLocation, updateDraftOrder } = useCustomerStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [address, setAddress] = useState(userLocation?.address || 'بوزوران، طريق بسكرة، باتنة');
  const [region, setRegion] = useState({
    latitude: userLocation?.latitude || 35.5557,
    longitude: userLocation?.longitude || 6.1748,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const mapRef = useRef<any>(null);
  const pinTranslateY = useRef(new Animated.Value(0)).current;

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  React.useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=dz`, {
          headers: {
            'User-Agent': 'AmmarliApp/1.0',
            'Accept-Language': 'ar'
          }
        });
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.log("Search error", error);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectLocation = (item: any) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    setRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    // Use the main name from the display name
    const shortAddress = item.display_name.split(',')[0];
    setAddress(shortAddress);
    
    if (Platform.OS !== 'web') {
      mapRef.current?.animateToRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  // Fresh Fetch on Mount
  React.useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High
          });
          const lat = location.coords.latitude;
          const lon = location.coords.longitude;
          
          setRegion(prev => ({
            ...prev,
            latitude: lat,
            longitude: lon
          }));

          if (Platform.OS !== 'web') {
            // Add a small delay to ensure the map component is fully mounted before animating
            setTimeout(() => {
              mapRef.current?.animateToRegion({
                latitude: lat,
                longitude: lon,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 1200);
            }, 300);
          }
          
          try {
            let geocode = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            });
            if (geocode.length > 0) {
              setAddress(geocode[0].district || geocode[0].street || geocode[0].city || address);
            }
          } catch (e) {
             console.log("Geocode error", e);
          }
        }
      } catch (error) {
        console.log("Fresh fetch failed", error);
      }
    })();
  }, []);

  // Animate pin up when dragging starts
  const onRegionChange = () => {
    Animated.spring(pinTranslateY, {
      toValue: -15,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  // Update coordinates and animate pin down when map moves
  const onRegionChangeComplete = async (newRegion: any) => {
    setRegion(newRegion);
    Animated.spring(pinTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    try {
      let geocode = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude
      });
      if (geocode.length > 0) {
        const shortAddress = geocode[0].district || geocode[0].street || geocode[0].city;
        if (shortAddress) setAddress(shortAddress);
      }
    } catch (e) {
      console.log("Geocode error on drag", e);
    }
  };

  const handleConfirmLocation = () => {
    updateDraftOrder({ location: { latitude: region.latitude, longitude: region.longitude, address } });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight || 24) + 20}>
      {/* 1. Map Background */}
      {Platform.OS === 'web' ? (
        <Image 
          source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview%0A(Use+Mobile+App+for+Full+Interactivity)' }}
          style={styles.map}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChange={onRegionChange}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={true}
        />
      )}

      {/* 2. Central Interactive Pin */}
      <View style={styles.markerFixed} pointerEvents="none">
        <Animated.View style={[styles.pinContainer, { transform: [{ translateY: pinTranslateY }] }]}>
          <View style={styles.customPinOuter}>
             <View style={styles.customPinInner} />
          </View>
          <View style={styles.customPinStem} />
        </Animated.View>
        <View style={styles.pinShadow} />
      </View>

      {/* 3. Top Search Bar */}
      <View style={[styles.topOverlay, { top: insets.top + 10 }, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.searchCard}>
          <TouchableOpacity style={styles.searchIcon}>
             {isSearching ? <ActivityIndicator size="small" color={COLORS.primaryBlue} /> : <Feather name="search" color={COLORS.gray} size={20} />}
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="بحث عن حي أو شارع..."
            placeholderTextColor={COLORS.gray}
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-right" color={COLORS.primaryBlue} size={24} />
          </TouchableOpacity>
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item, index) => item.place_id ? item.place_id.toString() : index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchResultItem} onPress={() => handleSelectLocation(item)}>
                  <Feather name="map-pin" color={COLORS.gray} size={16} style={{ marginLeft: 10 }} />
                  <Text style={styles.searchResultText} numberOfLines={1}>{item.display_name}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>

      {/* 4. GPS Location Button */}
      <TouchableOpacity 
        style={styles.gpsButton}
        onPress={async () => {
           try {
             let location = await Location.getCurrentPositionAsync({
               accuracy: Location.Accuracy.High,
             });
             const lat = location.coords.latitude;
             const lon = location.coords.longitude;
             setRegion(prev => ({
               ...prev,
               latitude: lat,
               longitude: lon
             }));
             if (Platform.OS !== 'web') {
               mapRef.current?.animateToRegion({
                 latitude: lat,
                 longitude: lon,
                 latitudeDelta: 0.01,
                 longitudeDelta: 0.01,
               }, 1000);
             }
             let geocode = await Location.reverseGeocodeAsync({
               latitude: lat,
               longitude: lon
             });
             if (geocode.length > 0) {
               setAddress(geocode[0].district || geocode[0].street || geocode[0].city || address);
             }
           } catch (e) {
             console.log("GPS fetch failed", e);
             Alert.alert("خطأ", "تعذر الحصول على موقعك الحالي. يرجى تفعيل خدمة الموقع (GPS).");
           }
        }}
      >
        <MaterialIconCrossPlatform name="crosshairs" size={24} color={COLORS.primaryBlue} />
      </TouchableOpacity>

      {/* 5. Bottom Sheet for Confirmation */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        
        <View style={styles.locationInfoRow}>
          <View style={styles.textContainer}>
            <Text style={styles.locationTitle}>{address}</Text>
            <Text style={styles.locationSubtitle}>اسحب الخريطة لتعديل موقع الدبوس</Text>
          </View>
          <View style={styles.iconBackground}>
            <Feather name="map-pin" color={COLORS.gray} size={24} />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmLocation}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Helper to avoid importing MaterialCommunityIcons if not needed
const MaterialIconCrossPlatform = ({name, size, color}: any) => {
  return <Feather name="crosshair" size={size} color={color} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerFixed: {
    left: '50%',
    marginLeft: -20, // Half of custom pin outer width
    marginTop: -55, // Full height to point precisely (40 outer + 15 stem)
    position: 'absolute',
    top: '50%',
    zIndex: 10,
  },
  pinContainer: {
    alignItems: 'center',
  },
  customPinOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#002147',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  customPinInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4AF37',
  },
  customPinStem: {
    width: 4,
    height: 15,
    backgroundColor: '#002147',
    marginTop: -2, // pull slightly up into the circle
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  pinShadow: {
    width: 16,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    marginTop: 2, // gap between stem and shadow
    transform: [{ scaleX: 2 }],
  },
  topOverlay: {
    position: 'absolute',
    // top is set dynamically via inline style using insets.top
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  searchCard: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.white,
    height: 55,
    borderRadius: 15,
    alignItems: 'center',
    paddingHorizontal: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginTop: 10,
    maxHeight: 250,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  searchResultText: {
    fontFamily: 'Cairo-SemiBold',
    fontSize: 14,
    color: COLORS.textDark,
    flex: 1,
    textAlign: 'left',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
    marginHorizontal: 10,
    marginTop: 4,
  },
  searchIcon: { padding: 5 },
  backButton: { padding: 5 },
  gpsButton: {
    position: 'absolute',
    bottom: 240,
    left: 20, // Moved to left to align with Arabic RTL logic
    backgroundColor: COLORS.white,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    // paddingBottom is set dynamically via inline style using insets.bottom
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    zIndex: 30,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginVertical: 15,
  },
  locationInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: 25,
  },
  textContainer: {
    marginRight: 15,
    alignItems: 'flex-end',
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
    marginBottom: 4,
  },
  locationSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: COLORS.gray,
  },
  iconBackground: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
  },
  confirmButton: {
    backgroundColor: COLORS.accentYellow,
    width: '100%',
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: COLORS.accentYellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmButtonText: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: COLORS.primaryBlue,
  },
});
