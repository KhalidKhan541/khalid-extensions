class ProfileManager {
  constructor() {
    this.profiles = [];
    this.settings = {
      skipEmptyFields: true,
      highlightFields: true,
      showFloatingButton: true,
      simulateTyping: true,
      typingSpeed: 30,
      highlightColor: '#4285f4'
    };
    this.recentFills = [];
    this.defaultProfileId = null;
  }

  async init() {
    const data = await chrome.storage.local.get(['profiles', 'settings', 'recentFills', 'defaultProfileId']);
    this.profiles = data.profiles || [];
    this.settings = { ...this.settings, ...(data.settings || {}) };
    this.recentFills = data.recentFills || [];
    this.defaultProfileId = data.defaultProfileId || null;
  }

  async save() {
    await chrome.storage.local.set({
      profiles: this.profiles,
      settings: this.settings,
      recentFills: this.recentFills,
      defaultProfileId: this.defaultProfileId
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  createProfile(data) {
    const profile = {
      id: this.generateId(),
      name: data.name || 'Untitled',
      color: data.color || '#4285f4',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fields: {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        country: data.country || '',
        company: data.company || '',
        jobTitle: data.jobTitle || '',
        website: data.website || '',
        notes: data.notes || ''
      },
      customFields: data.customFields || []
    };

    this.profiles.push(profile);
    this.save();
    return profile;
  }

  updateProfile(id, data) {
    const index = this.profiles.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.profiles[index] = {
      ...this.profiles[index],
      name: data.name || this.profiles[index].name,
      color: data.color || this.profiles[index].color,
      updatedAt: Date.now(),
      fields: { ...this.profiles[index].fields, ...data.fields },
      customFields: data.customFields !== undefined ? data.customFields : this.profiles[index].customFields
    };

    this.save();
    return this.profiles[index];
  }

  deleteProfile(id) {
    this.profiles = this.profiles.filter(p => p.id !== id);
    if (this.defaultProfileId === id) {
      this.defaultProfileId = null;
    }
    this.save();
  }

  getProfile(id) {
    return this.profiles.find(p => p.id === id) || null;
  }

  getAllProfiles() {
    return [...this.profiles];
  }

  searchProfiles(query) {
    if (!query) return this.getAllProfiles();
    const lower = query.toLowerCase();
    return this.profiles.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      (p.fields.company && p.fields.company.toLowerCase().includes(lower)) ||
      (p.fields.email && p.fields.email.toLowerCase().includes(lower))
    );
  }

  setDefault(id) {
    this.defaultProfileId = id;
    this.save();
  }

  getDefault() {
    return this.profiles.find(p => p.id === this.defaultProfileId) || null;
  }

  addRecentFill(profileId, url) {
    this.recentFills = this.recentFills.filter(r => r.profileId !== profileId || r.url !== url);
    this.recentFills.unshift({
      profileId,
      url,
      timestamp: Date.now()
    });
    this.recentFills = this.recentFills.slice(0, 20);
    this.save();
  }

  getRecentFills() {
    return this.recentFills.map(r => ({
      ...r,
      profile: this.getProfile(r.profileId)
    })).filter(r => r.profile);
  }

  validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePhone(phone) {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    return /^\+?[\d]{7,15}$/.test(cleaned);
  }

  validateProfile(data) {
    const errors = [];
    if (!data.name || !data.name.trim()) {
      errors.push('Profile name is required');
    }
    if (data.email && !this.validateEmail(data.email)) {
      errors.push('Invalid email format');
    }
    if (data.phone && !this.validatePhone(data.phone)) {
      errors.push('Invalid phone format');
    }
    return errors;
  }

  exportProfiles(ids) {
    const toExport = ids
      ? this.profiles.filter(p => ids.includes(p.id))
      : this.profiles;
    return JSON.stringify({
      version: 1,
      exportDate: new Date().toISOString(),
      profiles: toExport
    }, null, 2);
  }

  async importProfiles(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.profiles || !Array.isArray(data.profiles)) {
        throw new Error('Invalid format');
      }

      let imported = 0;
      for (const profile of data.profiles) {
        const existing = this.profiles.find(p => p.name === profile.name);
        if (existing) {
          this.updateProfile(existing.id, profile);
        } else {
          this.createProfile(profile);
        }
        imported++;
      }

      this.save();
      return { success: true, imported };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  getTemplates() {
    return [
      {
        id: 'personal',
        name: 'Personal Info',
        description: 'Basic personal contact information',
        fields: {
          firstName: '', lastName: '', email: '', phone: '',
          address: '', city: '', state: '', zip: '', country: '',
          company: '', jobTitle: '', website: '', notes: ''
        }
      },
      {
        id: 'business',
        name: 'Business Contact',
        description: 'Professional work information',
        fields: {
          firstName: '', lastName: '', email: '', phone: '',
          company: '', jobTitle: '', website: '',
          address: '', city: '', state: '', zip: '', country: '', notes: ''
        }
      },
      {
        id: 'shipping',
        name: 'Shipping Address',
        description: 'Delivery address for online orders',
        fields: {
          firstName: '', lastName: '', phone: '',
          address: '', city: '', state: '', zip: '', country: '', notes: ''
        }
      },
      {
        id: 'billing',
        name: 'Billing Address',
        description: 'Payment and billing information',
        fields: {
          firstName: '', lastName: '', email: '', phone: '',
          address: '', city: '', state: '', zip: '', country: '', notes: ''
        }
      }
    ];
  }

  getProfileFieldMap(profile) {
    const map = {};
    if (!profile) return map;

    const f = profile.fields;

    if (f.firstName) map['first-name'] = f.firstName;
    if (f.lastName) map['last-name'] = f.lastName;
    if (f.firstName && f.lastName) map['full-name'] = `${f.firstName} ${f.lastName}`;
    if (f.email) map['email'] = f.email;
    if (f.phone) map['phone'] = f.phone;
    if (f.address) map['street'] = f.address;
    if (f.city) map['city'] = f.city;
    if (f.state) map['state'] = f.state;
    if (f.zip) map['zip'] = f.zip;
    if (f.country) map['country'] = f.country;
    if (f.company) map['company'] = f.company;
    if (f.jobTitle) map['job-title'] = f.jobTitle;
    if (f.website) map['website'] = f.website;

    if (profile.customFields) {
      for (const cf of profile.customFields) {
        if (cf.key && cf.value) {
          map[cf.key.toLowerCase().replace(/\s+/g, '-')] = cf.value;
        }
      }
    }

    return map;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.save();
  }

  getSettings() {
    return { ...this.settings };
  }
}

const profileManager = new ProfileManager();
