'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Globe, MapPin } from 'lucide-react';

interface Country {
  iso2: string;
  name: string;
  flag?: string;
}

interface CountrySelectorProps {
  onSelect: (country: Country) => void;
  onClose: () => void;
  currentCountry?: Country | null;
}

// Comprehensive list of countries with ISO codes
const COUNTRIES: Country[] = [
  { iso2: 'US', name: 'United States' },
  { iso2: 'IN', name: 'India' },
  { iso2: 'CN', name: 'China' },
  { iso2: 'JP', name: 'Japan' },
  { iso2: 'DE', name: 'Germany' },
  { iso2: 'GB', name: 'United Kingdom' },
  { iso2: 'FR', name: 'France' },
  { iso2: 'IT', name: 'Italy' },
  { iso2: 'CA', name: 'Canada' },
  { iso2: 'BR', name: 'Brazil' },
  { iso2: 'AU', name: 'Australia' },
  { iso2: 'RU', name: 'Russia' },
  { iso2: 'KR', name: 'South Korea' },
  { iso2: 'ES', name: 'Spain' },
  { iso2: 'MX', name: 'Mexico' },
  { iso2: 'ID', name: 'Indonesia' },
  { iso2: 'NL', name: 'Netherlands' },
  { iso2: 'SA', name: 'Saudi Arabia' },
  { iso2: 'TR', name: 'Turkey' },
  { iso2: 'CH', name: 'Switzerland' },
  { iso2: 'AR', name: 'Argentina' },
  { iso2: 'SE', name: 'Sweden' },
  { iso2: 'PL', name: 'Poland' },
  { iso2: 'BE', name: 'Belgium' },
  { iso2: 'TH', name: 'Thailand' },
  { iso2: 'IR', name: 'Iran' },
  { iso2: 'AT', name: 'Austria' },
  { iso2: 'NO', name: 'Norway' },
  { iso2: 'AE', name: 'United Arab Emirates' },
  { iso2: 'IL', name: 'Israel' },
  { iso2: 'SG', name: 'Singapore' },
  { iso2: 'MY', name: 'Malaysia' },
  { iso2: 'PH', name: 'Philippines' },
  { iso2: 'VN', name: 'Vietnam' },
  { iso2: 'DK', name: 'Denmark' },
  { iso2: 'FI', name: 'Finland' },
  { iso2: 'CL', name: 'Chile' },
  { iso2: 'PT', name: 'Portugal' },
  { iso2: 'IE', name: 'Ireland' },
  { iso2: 'NZ', name: 'New Zealand' },
  { iso2: 'GR', name: 'Greece' },
  { iso2: 'CZ', name: 'Czech Republic' },
  { iso2: 'RO', name: 'Romania' },
  { iso2: 'HU', name: 'Hungary' },
  { iso2: 'BG', name: 'Bulgaria' },
  { iso2: 'HR', name: 'Croatia' },
  { iso2: 'SK', name: 'Slovakia' },
  { iso2: 'SI', name: 'Slovenia' },
  { iso2: 'LT', name: 'Lithuania' },
  { iso2: 'LV', name: 'Latvia' },
  { iso2: 'EE', name: 'Estonia' },
  { iso2: 'CY', name: 'Cyprus' },
  { iso2: 'LU', name: 'Luxembourg' },
  { iso2: 'MT', name: 'Malta' },
  { iso2: 'IS', name: 'Iceland' },
  { iso2: 'LI', name: 'Liechtenstein' },
  { iso2: 'MC', name: 'Monaco' },
  { iso2: 'SM', name: 'San Marino' },
  { iso2: 'VA', name: 'Vatican City' },
  { iso2: 'AD', name: 'Andorra' },
  { iso2: 'PK', name: 'Pakistan' },
  { iso2: 'BD', name: 'Bangladesh' },
  { iso2: 'LK', name: 'Sri Lanka' },
  { iso2: 'NP', name: 'Nepal' },
  { iso2: 'MM', name: 'Myanmar' },
  { iso2: 'KH', name: 'Cambodia' },
  { iso2: 'LA', name: 'Laos' },
  { iso2: 'MN', name: 'Mongolia' },
  { iso2: 'KZ', name: 'Kazakhstan' },
  { iso2: 'UZ', name: 'Uzbekistan' },
  { iso2: 'KG', name: 'Kyrgyzstan' },
  { iso2: 'TJ', name: 'Tajikistan' },
  { iso2: 'TM', name: 'Turkmenistan' },
  { iso2: 'AF', name: 'Afghanistan' },
  { iso2: 'IQ', name: 'Iraq' },
  { iso2: 'SY', name: 'Syria' },
  { iso2: 'LB', name: 'Lebanon' },
  { iso2: 'JO', name: 'Jordan' },
  { iso2: 'KW', name: 'Kuwait' },
  { iso2: 'QA', name: 'Qatar' },
  { iso2: 'BH', name: 'Bahrain' },
  { iso2: 'OM', name: 'Oman' },
  { iso2: 'YE', name: 'Yemen' },
  { iso2: 'EG', name: 'Egypt' },
  { iso2: 'MA', name: 'Morocco' },
  { iso2: 'DZ', name: 'Algeria' },
  { iso2: 'TN', name: 'Tunisia' },
  { iso2: 'LY', name: 'Libya' },
  { iso2: 'SD', name: 'Sudan' },
  { iso2: 'SS', name: 'South Sudan' },
  { iso2: 'ET', name: 'Ethiopia' },
  { iso2: 'KE', name: 'Kenya' },
  { iso2: 'TZ', name: 'Tanzania' },
  { iso2: 'UG', name: 'Uganda' },
  { iso2: 'RW', name: 'Rwanda' },
  { iso2: 'BI', name: 'Burundi' },
  { iso2: 'CD', name: 'Democratic Republic of the Congo' },
  { iso2: 'CG', name: 'Republic of the Congo' },
  { iso2: 'GA', name: 'Gabon' },
  { iso2: 'CM', name: 'Cameroon' },
  { iso2: 'CF', name: 'Central African Republic' },
  { iso2: 'TD', name: 'Chad' },
  { iso2: 'NE', name: 'Niger' },
  { iso2: 'ML', name: 'Mali' },
  { iso2: 'BF', name: 'Burkina Faso' },
  { iso2: 'CI', name: 'Ivory Coast' },
  { iso2: 'GH', name: 'Ghana' },
  { iso2: 'TG', name: 'Togo' },
  { iso2: 'BJ', name: 'Benin' },
  { iso2: 'NG', name: 'Nigeria' },
  { iso2: 'SN', name: 'Senegal' },
  { iso2: 'GM', name: 'Gambia' },
  { iso2: 'GN', name: 'Guinea' },
  { iso2: 'GW', name: 'Guinea-Bissau' },
  { iso2: 'SL', name: 'Sierra Leone' },
  { iso2: 'LR', name: 'Liberia' },
  { iso2: 'MR', name: 'Mauritania' },
  { iso2: 'CV', name: 'Cape Verde' },
  { iso2: 'ST', name: 'São Tomé and Príncipe' },
  { iso2: 'GQ', name: 'Equatorial Guinea' },
  { iso2: 'DJ', name: 'Djibouti' },
  { iso2: 'SO', name: 'Somalia' },
  { iso2: 'ER', name: 'Eritrea' },
  { iso2: 'ZW', name: 'Zimbabwe' },
  { iso2: 'ZM', name: 'Zambia' },
  { iso2: 'MW', name: 'Malawi' },
  { iso2: 'MZ', name: 'Mozambique' },
  { iso2: 'BW', name: 'Botswana' },
  { iso2: 'NA', name: 'Namibia' },
  { iso2: 'SZ', name: 'Eswatini' },
  { iso2: 'LS', name: 'Lesotho' },
  { iso2: 'MG', name: 'Madagascar' },
  { iso2: 'MU', name: 'Mauritius' },
  { iso2: 'SC', name: 'Seychelles' },
  { iso2: 'KM', name: 'Comoros' },
  { iso2: 'ZA', name: 'South Africa' },
  { iso2: 'PE', name: 'Peru' },
  { iso2: 'CO', name: 'Colombia' },
  { iso2: 'VE', name: 'Venezuela' },
  { iso2: 'EC', name: 'Ecuador' },
  { iso2: 'BO', name: 'Bolivia' },
  { iso2: 'PY', name: 'Paraguay' },
  { iso2: 'UY', name: 'Uruguay' },
  { iso2: 'GY', name: 'Guyana' },
  { iso2: 'SR', name: 'Suriname' },
  { iso2: 'FK', name: 'Falkland Islands' },
  { iso2: 'GF', name: 'French Guiana' },
  { iso2: 'GT', name: 'Guatemala' },
  { iso2: 'BZ', name: 'Belize' },
  { iso2: 'SV', name: 'El Salvador' },
  { iso2: 'HN', name: 'Honduras' },
  { iso2: 'NI', name: 'Nicaragua' },
  { iso2: 'CR', name: 'Costa Rica' },
  { iso2: 'PA', name: 'Panama' },
  { iso2: 'CU', name: 'Cuba' },
  { iso2: 'JM', name: 'Jamaica' },
  { iso2: 'HT', name: 'Haiti' },
  { iso2: 'DO', name: 'Dominican Republic' },
  { iso2: 'PR', name: 'Puerto Rico' },
  { iso2: 'TT', name: 'Trinidad and Tobago' },
  { iso2: 'BB', name: 'Barbados' },
  { iso2: 'GD', name: 'Grenada' },
  { iso2: 'LC', name: 'Saint Lucia' },
  { iso2: 'VC', name: 'Saint Vincent and the Grenadines' },
  { iso2: 'AG', name: 'Antigua and Barbuda' },
  { iso2: 'KN', name: 'Saint Kitts and Nevis' },
  { iso2: 'DM', name: 'Dominica' },
  { iso2: 'BS', name: 'Bahamas' },
  { iso2: 'FJ', name: 'Fiji' },
  { iso2: 'PG', name: 'Papua New Guinea' },
  { iso2: 'SB', name: 'Solomon Islands' },
  { iso2: 'VU', name: 'Vanuatu' },
  { iso2: 'NC', name: 'New Caledonia' },
  { iso2: 'PF', name: 'French Polynesia' },
  { iso2: 'TO', name: 'Tonga' },
  { iso2: 'WS', name: 'Samoa' },
  { iso2: 'KI', name: 'Kiribati' },
  { iso2: 'TV', name: 'Tuvalu' },
  { iso2: 'NR', name: 'Nauru' },
  { iso2: 'PW', name: 'Palau' },
  { iso2: 'MH', name: 'Marshall Islands' },
  { iso2: 'FM', name: 'Micronesia' },
  { iso2: 'CK', name: 'Cook Islands' },
  { iso2: 'NU', name: 'Niue' },
  { iso2: 'TK', name: 'Tokelau' },
  { iso2: 'AS', name: 'American Samoa' },
  { iso2: 'GU', name: 'Guam' },
  { iso2: 'MP', name: 'Northern Mariana Islands' },
  { iso2: 'PW', name: 'Palau' },
  { iso2: 'MH', name: 'Marshall Islands' },
  { iso2: 'FM', name: 'Micronesia' },
  { iso2: 'CK', name: 'Cook Islands' },
  { iso2: 'NU', name: 'Niue' },
  { iso2: 'TK', name: 'Tokelau' },
  { iso2: 'AS', name: 'American Samoa' },
  { iso2: 'GU', name: 'Guam' },
  { iso2: 'MP', name: 'Northern Mariana Islands' }
];

export default function CountrySelector({ onSelect, onClose, currentCountry }: CountrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchTerm) return COUNTRIES;
    return COUNTRIES.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.iso2.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Select Your Country
          </CardTitle>
          <p className="text-sm text-gray-600">
            Choose your country to get accurate emergency contact numbers
          </p>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Current Country Display */}
          {currentCountry && (
            <div className="p-4 bg-green-50 border-b">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Current: {currentCountry.name}
                </span>
              </div>
            </div>
          )}

          {/* Countries List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No countries found matching "{searchTerm}"
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1">
                {filteredCountries.map((country) => (
                  <button
                    key={country.iso2}
                    onClick={() => onSelect(country)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {country.iso2}
                      </Badge>
                      <span className="font-medium">{country.name}</span>
                    </div>
                    {currentCountry?.iso2 === country.iso2 && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredCountries.length} countries available
            </span>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
