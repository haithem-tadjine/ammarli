import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';
import { WebView } from 'react-native-webview';

export const Marker = (props: any) => null;
export const Polyline = (props: any) => null;
export const CachedUrlTile = (props: any) => null;
export const Circle = (props: any) => null;

const MapView = forwardRef(({ children, initialRegion, region, style, onRegionChangeComplete, showsUserLocation, onRegionChange, pointerEvents }: any, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (newRegion: any, duration?: number) => {
      if (webViewRef.current && newRegion) {
        webViewRef.current.injectJavaScript(`
          if (typeof map !== 'undefined') {
            map.setView([${newRegion.latitude}, ${newRegion.longitude}], 18, { animate: true });
          }
          true;
        `);
      }
    }
  }));

  const markers: any[] = [];
  const polylines: any[] = [];
  const circles: any[] = [];

  React.Children.forEach(children, (child: any) => {
    if (!React.isValidElement(child)) return;
    const type: any = child.type;
    const props: any = child.props;
    if (type === Marker || type?.name === 'Marker') {
      markers.push({
        coordinate: props.coordinate,
        title: props.title,
        id: props.identifier || Math.random().toString(),
        iconType: props.iconType
      });
    } else if (type === Polyline || type?.name === 'Polyline') {
      polylines.push({
        coordinates: props.coordinates,
        strokeColor: props.strokeColor,
        strokeWidth: props.strokeWidth
      });
    } else if (type === Circle || type?.name === 'Circle') {
      circles.push({
        center: props.center,
        radius: props.radius,
        fillColor: props.fillColor,
        strokeColor: props.strokeColor
      });
    }
  });

  const activeRegion = region || initialRegion || { latitude: 35.5557, longitude: 6.1748, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #F8F9FA; }
            html, body, #map { height: 100%; width: 100%; }
            .leaflet-control-attribution { display: none; }
            
            .custom-marker {
              width: 24px;
              height: 24px;
              background-color: #002147;
              border-radius: 50%;
              border: 3px solid #FFCC00;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            .truck-marker {
              width: 32px;
              height: 32px;
              background-color: #FFCC00;
              border-radius: 8px;
              border: 2px solid #002147;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 20px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${activeRegion.latitude}, ${activeRegion.longitude}], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19
            }).addTo(map);

            var customIcon = L.divIcon({
              className: 'custom-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            var truckIcon = L.divIcon({
              className: 'truck-marker',
              html: '🚛',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });

            var markersLayer = L.layerGroup().addTo(map);
            var polylinesLayer = L.layerGroup().addTo(map);
            var circlesLayer = L.layerGroup().addTo(map);

            var isDragging = false;

            map.on('movestart', function() {
              isDragging = true;
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'onRegionChange' }));
            });

            map.on('moveend', function() {
                isDragging = false;
                var center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'onRegionChangeComplete',
                    region: { latitude: center.lat, longitude: center.lng }
                }));
            });

            window.updateMapData = function(dataStr) {
                try {
                    var data = JSON.parse(dataStr);
                    
                    if (data.region && !isDragging) {
                       map.setView([data.region.latitude, data.region.longitude]);
                    }

                    if (data.markers) {
                        markersLayer.clearLayers();
                        data.markers.forEach(function(m) {
                            var iconToUse = m.iconType === 'truck' ? truckIcon : customIcon;
                            var marker = L.marker([m.coordinate.latitude, m.coordinate.longitude], {icon: iconToUse}).addTo(markersLayer);
                            if (m.title) marker.bindPopup(m.title);
                        });
                    }

                    if (data.polylines) {
                        polylinesLayer.clearLayers();
                        data.polylines.forEach(function(p) {
                            var latlngs = p.coordinates.map(function(c) { return [c.latitude, c.longitude]; });
                            L.polyline(latlngs, {color: p.strokeColor || '#002147', weight: p.strokeWidth || 4}).addTo(polylinesLayer);
                        });
                    }

                    if (data.circles) {
                        circlesLayer.clearLayers();
                        data.circles.forEach(function(c) {
                            L.circle([c.center.latitude, c.center.longitude], {
                                color: c.strokeColor || '#002147',
                                fillColor: c.fillColor || '#002147',
                                fillOpacity: 0.2,
                                radius: c.radius || 100
                            }).addTo(circlesLayer);
                        });
                    }
                } catch(e) {}
            };

            // Initialize map with initial children data
            window.updateMapData(JSON.stringify(${JSON.stringify({ region: activeRegion, markers, polylines, circles })}));
        </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (webViewRef.current) {
       const data = {
         region: region,
         markers: markers,
         polylines: polylines,
         circles: circles
       };
       webViewRef.current.injectJavaScript(`if(window.updateMapData) window.updateMapData('${JSON.stringify(data)}'); true;`);
    }
  }, [region, children]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'onRegionChangeComplete' && onRegionChangeComplete) {
         onRegionChangeComplete(data.region);
      } else if (data.type === 'onRegionChange' && onRegionChange) {
         onRegionChange();
      }
    } catch(e) {}
  };

  // If web, just show a placeholder (for development)
  if (Platform.OS === 'web') {
    return (
      <View style={[style, styles.webPlaceholder]}>
         <Image 
            source={{ uri: 'https://placehold.co/800x800/EAECEE/002147?font=roboto&text=Map+Preview%0A(Use+Mobile+App+for+Full+Interactivity)' }}
            style={StyleSheet.absoluteFillObject}
          />
      </View>
    );
  }

  return (
    <View style={style} pointerEvents={pointerEvents}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={onMessage}
        scrollEnabled={false}
        javaScriptEnabled={true}
        bounces={false}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  webPlaceholder: {
    backgroundColor: '#EAECEE',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default MapView;
MapView.displayName = 'MapView';
