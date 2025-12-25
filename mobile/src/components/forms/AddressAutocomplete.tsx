import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Keyboard } from 'react-native';
import { TextInput, Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

// Type pour les résultats de l'API adresse.data.gouv.fr
interface AddressSuggestion {
  label: string;        // Adresse complète formatée
  street: string;       // Numéro + rue
  city: string;         // Ville
  postalCode: string;   // Code postal
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  value: string;
  onAddressSelect: (address: {
    street: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function AddressAutocomplete({
  value,
  onAddressSelect,
  placeholder = "Rechercher une adresse...",
  label = "Adresse",
  error,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Appel à l'API adresse.data.gouv.fr
  const searchAddresses = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchQuery)}&limit=5&autocomplete=1`
      );
      const data = await response.json();

      const formattedSuggestions: AddressSuggestion[] = data.features.map((feature: any) => ({
        label: feature.properties.label,
        street: feature.properties.name,
        city: feature.properties.city,
        postalCode: feature.properties.postcode,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce pour éviter trop d'appels API
  const handleTextChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddresses(text);
    }, 300);
  }, []);

  // Sélection d'une adresse
  const handleSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.label);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();

    onAddressSelect({
      street: suggestion.street,
      city: suggestion.city,
      postalCode: suggestion.postalCode,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  };

  // Rendu d'une suggestion
  const renderSuggestion = ({ item }: { item: AddressSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelect(item)}
    >
      <MaterialCommunityIcons 
        name="map-marker" 
        size={20} 
        color={colors.primary} 
        style={styles.suggestionIcon}
      />
      <View style={styles.suggestionContent}>
        <Text variant="bodyMedium" style={styles.suggestionStreet}>
          {item.street}
        </Text>
        <Text variant="bodySmall" style={styles.suggestionCity}>
          {item.postalCode} {item.city}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        label={label}
        value={query}
        onChangeText={handleTextChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        mode="outlined"
        placeholder={placeholder}
        style={styles.input}
        error={!!error}
        right={
          isLoading ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={20} color={colors.primary} />} />
          ) : query.length > 0 ? (
            <TextInput.Icon 
              icon="close" 
              onPress={() => {
                setQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }} 
            />
          ) : (
            <TextInput.Icon icon="magnify" />
          )
        }
      />
      
      {error && (
        <Text variant="bodySmall" style={styles.errorText}>{error}</Text>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.label}-${index}`}
            renderItem={renderSuggestion}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.error,
    marginTop: 4,
    marginLeft: 12,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 250,
    zIndex: 1001,
  },
  suggestionsList: {
    borderRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionStreet: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  suggestionCity: {
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});