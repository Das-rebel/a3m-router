"use strict";
/**
 * A3M Router - Geo-Location Based Routing
 *
 * Route LLM queries to providers based on geographic location:
 * - Latency optimization (nearest provider)
 * - Data sovereignty (EU data stays in EU)
 * - Compliance (GDPR, CCPA)
 * - Regional provider preferences
 */

// Provider regions and data centers
const PROVIDER_REGIONS = {
  groq: {
    regions: ['us-west', 'us-east', 'eu-west'],
    dataCenters: {
      'us-west': { lat: 37.7749, lon: -122.4194, location: 'San Francisco' },
      'us-east': { lat: 40.7128, lon: -74.0060, location: 'New York' },
      'eu-west': { lat: 53.3498, lon: -6.2603, location: 'Dublin' },
    },
    gdprCompliant: true,
    soc2Compliant: true,
  },
  cerebras: {
    regions: ['us-west', 'us-central'],
    dataCenters: {
      'us-west': { lat: 37.7749, lon: -122.4194, location: 'San Francisco' },
      'us-central': { lat: 41.8781, lon: -87.6298, location: 'Chicago' },
    },
    gdprCompliant: false,
    soc2Compliant: true,
  },
  mistral: {
    regions: ['eu-west', 'eu-central'],
    dataCenters: {
      'eu-west': { lat: 48.8566, lon: 2.3522, location: 'Paris' },
      'eu-central': { lat: 50.1109, lon: 8.6821, location: 'Frankfurt' },
    },
    gdprCompliant: true,
    soc2Compliant: true,
  },
  openai: {
    regions: ['us-west', 'us-east', 'eu-west', 'apac'],
    dataCenters: {
      'us-west': { lat: 37.7749, lon: -122.4194, location: 'San Francisco' },
      'us-east': { lat: 40.7128, lon: -74.0060, location: 'New York' },
      'eu-west': { lat: 53.3498, lon: -6.2603, location: 'Dublin' },
      'apac': { lat: 1.3521, lon: 103.8198, location: 'Singapore' },
    },
    gdprCompliant: true,
    soc2Compliant: true,
  },
  anthropic: {
    regions: ['us-west', 'us-east'],
    dataCenters: {
      'us-west': { lat: 37.7749, lon: -122.4194, location: 'San Francisco' },
      'us-east': { lat: 40.7128, lon: -74.0060, location: 'New York' },
    },
    gdprCompliant: false,
    soc2Compliant: true,
  },
  google: {
    regions: ['us-central', 'us-east', 'eu-west', 'eu-central', 'apac', 'apac-east'],
    dataCenters: {
      'us-central': { lat: 41.8781, lon: -87.6298, location: 'Iowa' },
      'us-east': { lat: 33.7490, lon: -84.3880, location: 'Georgia' },
      'eu-west': { lat: 53.3498, lon: -6.2603, location: 'Dublin' },
      'eu-central': { lat: 50.4500, lon: 3.8180, location: 'Belgium' },
      'apac': { lat: 1.3521, lon: 103.8198, location: 'Singapore' },
      'apac-east': { lat: 35.6762, lon: 139.6503, location: 'Tokyo' },
    },
    gdprCompliant: true,
    soc2Compliant: true,
  },
};

// Regional compliance requirements
const COMPLIANCE_RULES = {
  gdpr: {
    regions: ['EU', 'EEA'],
    required: ['gdprCompliant'],
    dataResidency: true,
  },
  ccpa: {
    regions: ['California'],
    required: ['privacyPolicy'],
    dataResidency: false,
  },
  hipaa: {
    regions: ['US-Healthcare'],
    required: ['hipaaCompliant', 'baa'],
    dataResidency: true,
  },
  fedramp: {
    regions: ['US-Government'],
    required: ['fedrampAuthorized'],
    dataResidency: true,
  },
};

class GeoRouter {
  constructor(options = {}) {
    this.options = {
      defaultRegion: options.defaultRegion || 'us-east',
      enforceGDPR: options.enforceGDPR || false,
      enforceCCPA: options.enforceCCPA || false,
      dataResidency: options.dataResidency || null, // 'EU', 'US', etc.
      preferLowLatency: options.preferLowLatency !== false,
      maxLatencyMs: options.maxLatencyMs || 500,
      ...options,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Estimate latency based on distance
   */
  estimateLatency(distanceKm) {
    // Rough estimate: 1ms per 100km + 50ms base
    return Math.round(distanceKm / 100 + 50);
  }

  /**
   * Get user's location from IP or explicit coordinates
   */
  async getUserLocation(ipAddress, explicitCoords = null) {
    if (explicitCoords) {
      return {
        lat: explicitCoords.lat,
        lon: explicitCoords.lon,
        region: explicitCoords.region || this.inferRegion(explicitCoords.lat, explicitCoords.lon),
        country: explicitCoords.country,
        source: 'explicit',
      };
    }

    // In production, use a geolocation service
    // For now, return default
    return {
      lat: 40.7128,
      lon: -74.006,
      region: 'us-east',
      country: 'US',
      source: 'default',
    };
  }

  /**
   * Infer region from coordinates
   */
  inferRegion(lat, lon) {
    // Rough region inference
    if (lat > 25 && lat < 50 && lon > -130 && lon < -60) return 'us-east';
    if (lat > 25 && lat < 50 && lon > -125 && lon < -115) return 'us-west';
    if (lat > 35 && lat < 70 && lon > -10 && lon < 40) return 'eu-west';
    if (lat > 10 && lat < 40 && lon > 100 && lon < 150) return 'apac';
    return this.options.defaultRegion;
  }

  /**
   * Check if provider meets compliance requirements
   */
  checkCompliance(providerId, compliance = []) {
    const provider = PROVIDER_REGIONS[providerId];
    if (!provider) return { compliant: false, reason: 'Unknown provider' };

    const results = {
      compliant: true,
      checks: {},
      failed: [],
    };

    for (const req of compliance) {
      const rule = COMPLIANCE_RULES[req];
      if (!rule) continue;

      for (const requirement of rule.required) {
        const check = this.checkRequirement(provider, requirement);
        results.checks[requirement] = check;

        if (!check.passed) {
          results.compliant = false;
          results.failed.push({ requirement, reason: check.reason });
        }
      }
    }

    return results;
  }

  checkRequirement(provider, requirement) {
    switch (requirement) {
      case 'gdprCompliant':
        return {
          passed: provider.gdprCompliant,
          reason: provider.gdprCompliant ? null : 'Provider not GDPR compliant',
        };
      case 'soc2Compliant':
        return {
          passed: provider.soc2Compliant,
          reason: provider.soc2Compliant ? null : 'Provider not SOC2 compliant',
        };
      default:
        return { passed: true, reason: null };
    }
  }

  /**
   * Find nearest provider data center
   */
  findNearestRegion(providerId, userLocation) {
    const provider = PROVIDER_REGIONS[providerId];
    if (!provider) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const [region, coords] of Object.entries(provider.dataCenters)) {
      const distance = this.calculateDistance(
        userLocation.lat,
        userLocation.lon,
        coords.lat,
        coords.lon
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          region,
          distance,
          estimatedLatency: this.estimateLatency(distance),
          location: coords.location,
        };
      }
    }

    return nearest;
  }

  /**
   * Route query based on geographic location
   */
  async routeByLocation(query, options = {}) {
    const userLocation = await this.getUserLocation(
      options.ipAddress,
      options.coordinates
    );

    const availableProviders = options.providers || Object.keys(PROVIDER_REGIONS);
    const candidates = [];

    for (const providerId of availableProviders) {
      const provider = PROVIDER_REGIONS[providerId];
      if (!provider) continue;

      // Check compliance
      if (options.compliance?.length > 0) {
        const compliance = this.checkCompliance(providerId, options.compliance);
        if (!compliance.compliant) {
          continue;
        }
      }

      // Check data residency
      if (this.options.dataResidency) {
        const hasRegionInResidency = provider.regions.some((r) =>
          r.toLowerCase().includes(this.options.dataResidency.toLowerCase())
        );
        if (!hasRegionInResidency) continue;
      }

      // Find nearest region
      const nearest = this.findNearestRegion(providerId, userLocation);
      if (!nearest) continue;

      // Check latency constraint
      if (nearest.estimatedLatency > this.options.maxLatencyMs) {
        continue;
      }

      candidates.push({
        provider: providerId,
        region: nearest.region,
        distance: nearest.distance,
        estimatedLatency: nearest.estimatedLatency,
        location: nearest.location,
        gdprCompliant: provider.gdprCompliant,
      });
    }

    // Sort by latency
    candidates.sort((a, b) => a.estimatedLatency - b.estimatedLatency);

    return {
      userLocation,
      candidates,
      recommended: candidates[0] || null,
      alternatives: candidates.slice(1, 4),
    };
  }

  /**
   * Get provider regions info
   */
  getProviderRegions(providerId) {
    return PROVIDER_REGIONS[providerId] || null;
  }

  /**
   * List all available regions
   */
  listRegions() {
    const regions = new Set();
    for (const provider of Object.values(PROVIDER_REGIONS)) {
      for (const region of provider.regions) {
        regions.add(region);
      }
    }
    return Array.from(regions).sort();
  }

  /**
   * Get compliance status for all providers
   */
  getComplianceStatus() {
    const status = {};
    for (const [providerId, provider] of Object.entries(PROVIDER_REGIONS)) {
      status[providerId] = {
        gdpr: provider.gdprCompliant,
        soc2: provider.soc2Compliant,
        regions: provider.regions,
      };
    }
    return status;
  }
}

// Convenience functions
async function routeByLocation(query, options = {}) {
  const router = new GeoRouter(options);
  return router.routeByLocation(query, options);
}

function getProviderRegions(providerId) {
  const router = new GeoRouter();
  return router.getProviderRegions(providerId);
}

function listRegions() {
  const router = new GeoRouter();
  return router.listRegions();
}

function getComplianceStatus() {
  const router = new GeoRouter();
  return router.getComplianceStatus();
}

module.exports = {
  GeoRouter,
  routeByLocation,
  getProviderRegions,
  listRegions,
  getComplianceStatus,
  PROVIDER_REGIONS,
  COMPLIANCE_RULES,
};
