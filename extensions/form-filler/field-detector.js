class FieldDetector {
  constructor() {
    this.FIELD_PATTERNS = {
      'first-name': {
        name: [/^first.?name$/i, /^f.?name$/i, /^fname$/i, /^prenom$/i, /^vorname$/i],
        id: [/^first.?name$/i, /^f.?name$/i, /^fname$/i],
        placeholder: [/^first.?name$/i, /^vorname$/i, /^prenom$/i],
        label: [/^first.?name$/i, /^vorname$/i, /^prenom$/i, /^given.?name$/i],
        autocomplete: ['given-name'],
        ariaLabel: [/^first.?name$/i]
      },
      'last-name': {
        name: [/^last.?name$/i, /^l.?name$/i, /^lname$/i, /^surname$/i, /^nachname$/i, /^nom$/i],
        id: [/^last.?name$/i, /^l.?name$/i, /^lname$/i, /^surname$/i],
        placeholder: [/^last.?name$/i, /^surname$/i, /^nachname$/i],
        label: [/^last.?name$/i, /^surname$/i, /^family.?name$/i, /^nachname$/i],
        autocomplete: ['family-name', 'surname'],
        ariaLabel: [/^last.?name$/i, /^surname$/i]
      },
      'full-name': {
        name: [/^full.?name$/i, /^name$/i, /^your.?name$/i, /^customer.?name$/i],
        id: [/^full.?name$/i, /^name$/i, /^your.?name$/i],
        placeholder: [/^full.?name$/i, /^name$/i, /^your.?name$/i],
        label: [/^full.?name$/i, /^name$/i, /^your.?name$/i],
        autocomplete: ['name'],
        ariaLabel: [/^full.?name$/i, /^name$/i]
      },
      'email': {
        name: [/^e?-?mail$/i, /^email.?address$/i, /^e.?mail$/i, /^correo$/i, /^e-post$/i],
        id: [/^e?-?mail$/i, /^email.?address$/i],
        placeholder: [/^e?-?mail$/i, /^email.?address$/i, /^your.?email$/i],
        label: [/^e?-?mail$/i, /^email.?address$/i, /^your.?email$/i],
        autocomplete: ['email'],
        type: ['email'],
        ariaLabel: [/^e?-?mail$/i]
      },
      'phone': {
        name: [/^phone$/i, /^tel$/i, /^telephone$/i, /^mobile$/i, /^cell$/i, /^phone.?number$/i, /^handy$/i, /^telefono$/i],
        id: [/^phone$/i, /^tel$/i, /^telephone$/i, /^mobile$/i],
        placeholder: [/^phone$/i, /^tel$/i, /^telephone$/i, /^\+\d/],
        label: [/^phone$/i, /^tel$/i, /^telephone$/i, /^mobile$/i, /^cell$/i],
        autocomplete: ['tel'],
        type: ['tel'],
        ariaLabel: [/^phone$/i, /^tel$/i]
      },
      'street': {
        name: [/^address$/i, /^street$/i, /^address.?1$/i, /^street.?address$/i, /^addr$/i, /^strasse$/i, /^adresse$/i],
        id: [/^address$/i, /^street$/i, /^address.?1$/i, /^addr$/i],
        placeholder: [/^address$/i, /^street$/i, /^street.?address$/i],
        label: [/^address$/i, /^street$/i, /^street.?address$/i, /^address.?line.?1$/i, /^strasse$/i],
        autocomplete: ['street-address', 'address-line1'],
        ariaLabel: [/^address$/i, /^street$/i]
      },
      'city': {
        name: [/^city$/i, /^town$/i, /^ort$/i, /^ville$/i, /^ciudad$/i],
        id: [/^city$/i, /^town$/i, /^ort$/i],
        placeholder: [/^city$/i, /^town$/i, /^ort$/i],
        label: [/^city$/i, /^town$/i, /^ort$/i, /^ville$/i],
        autocomplete: ['address-level2'],
        ariaLabel: [/^city$/i, /^town$/i]
      },
      'state': {
        name: [/^state$/i, /^province$/i, /^region$/i, /^county$/i, /^bundesland$/i, /^estado$/i],
        id: [/^state$/i, /^province$/i, /^region$/i],
        placeholder: [/^state$/i, /^province$/i],
        label: [/^state$/i, /^province$/i, /^region$/i, /^bundesland$/i],
        autocomplete: ['address-level1'],
        ariaLabel: [/^state$/i, /^province$/i]
      },
      'zip': {
        name: [/^zip$/i, /^postal.?code$/i, /^zip.?code$/i, /^postleitzahl$/i, /^plz$/i, /^codigo.?postal$/i],
        id: [/^zip$/i, /^postal.?code$/i, /^zip.?code$/i, /^plz$/i],
        placeholder: [/^zip$/i, /^postal.?code$/i, /^\d{4,6}$/],
        label: [/^zip$/i, /^postal.?code$/i, /^zip.?code$/i, /^postleitzahl$/i],
        autocomplete: ['postal-code'],
        ariaLabel: [/^zip$/i, /^postal.?code$/i]
      },
      'country': {
        name: [/^country$/i, /^land$/i, /^pays$/i, /^pais$/i],
        id: [/^country$/i, /^land$/i],
        placeholder: [/^country$/i, /^land$/i],
        label: [/^country$/i, /^land$/i, /^pays$/i],
        autocomplete: ['country', 'country-name'],
        ariaLabel: [/^country$/i]
      },
      'company': {
        name: [/^company$/i, /^organization$/i, /^firm$/i, /^business$/i, /^firma$/i, /^unternehmen$/i, /^entreprise$/i],
        id: [/^company$/i, /^organization$/i, /^firm$/i],
        placeholder: [/^company$/i, /^organization$/i, /^business$/i],
        label: [/^company$/i, /^organization$/i, /^firm$/i, /^business$/i],
        autocomplete: ['organization'],
        ariaLabel: [/^company$/i, /^organization$/i]
      },
      'job-title': {
        name: [/^job.?title$/i, /^title$/i, /^position$/i, /^role$/i, /^beruf$/i, /^职位$/i],
        id: [/^job.?title$/i, /^title$/i, /^position$/i],
        placeholder: [/^job.?title$/i, /^position$/i, /^role$/i],
        label: [/^job.?title$/i, /^title$/i, /^position$/i, /^role$/i],
        autocomplete: ['organization-title'],
        ariaLabel: [/^job.?title$/i, /^position$/i]
      },
      'website': {
        name: [/^website$/i, /^url$/i, /^site$/i, /^homepage$/i, /^blog$/i],
        id: [/^website$/i, /^url$/i, /^site$/i],
        placeholder: [/^website$/i, /^url$/i, /^https?:\/\//i],
        label: [/^website$/i, /^url$/i, /^site$/i],
        autocomplete: ['url'],
        type: ['url'],
        ariaLabel: [/^website$/i, /^url$/i]
      }
    };

    this.CAPTCHA_SELECTORS = [
      '[class*="captcha"]',
      '[id*="captcha"]',
      '[class*="recaptcha"]',
      '[id*="recaptcha"]',
      '[class*="g-recaptcha"]',
      '[data-sitekey]',
      'iframe[src*="recaptcha"]',
      'iframe[src*="captcha"]',
      '[class*="cf-turnstile"]',
      '[class*="hcaptcha"]'
    ];

    this.SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio'];
  }

  detectFields(container = document) {
    const fields = [];
    const inputs = container.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      if (this.shouldSkipField(input)) return;

      const detection = this.classifyField(input);
      if (detection) {
        fields.push({
          element: input,
          fieldType: detection.fieldType,
          confidence: detection.confidence,
          matchSource: detection.matchSource
        });
      }
    });

    return fields;
  }

  shouldSkipField(input) {
    const type = (input.type || '').toLowerCase();
    if (this.SKIP_TYPES.includes(type)) return true;
    if (input.disabled || input.readOnly) return true;
    if (input.offsetHeight === 0 && input.offsetWidth === 0) return true;

    for (const selector of this.CAPTCHA_SELECTORS) {
      if (input.matches(selector) || input.closest(selector)) return true;
    }

    if (input.closest('[class*="captcha"]') || input.closest('[id*="captcha"]')) return true;

    return false;
  }

  classifyField(input) {
    const candidates = [];

    for (const [fieldType, patterns] of Object.entries(this.FIELD_PATTERNS)) {
      let confidence = 0;
      let matchSource = '';

      // Check autocomplete attribute (highest confidence)
      if (patterns.autocomplete) {
        const autocomplete = input.getAttribute('autocomplete');
        if (autocomplete && patterns.autocomplete.includes(autocomplete.toLowerCase())) {
          confidence = 100;
          matchSource = 'autocomplete';
        }
      }

      // Check name attribute
      if (confidence < 100 && patterns.name) {
        const name = input.getAttribute('name');
        if (name && patterns.name.some(p => p.test(name))) {
          confidence = Math.max(confidence, 90);
          matchSource = 'name';
        }
      }

      // Check id attribute
      if (confidence < 100 && patterns.id) {
        const id = input.id;
        if (id && patterns.id.some(p => p.test(id))) {
          confidence = Math.max(confidence, 85);
          matchSource = 'id';
        }
      }

      // Check type attribute
      if (confidence < 100 && patterns.type) {
        const type = (input.type || '').toLowerCase();
        if (patterns.type.includes(type)) {
          confidence = Math.max(confidence, 70);
          matchSource = 'type';
        }
      }

      // Check placeholder
      if (confidence < 100 && patterns.placeholder) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder && patterns.placeholder.some(p => p.test(placeholder))) {
          confidence = Math.max(confidence, 75);
          matchSource = 'placeholder';
        }
      }

      // Check aria-label
      if (confidence < 100 && patterns.ariaLabel) {
        const ariaLabel = input.getAttribute('aria-label');
        if (ariaLabel && patterns.ariaLabel.some(p => p.test(ariaLabel))) {
          confidence = Math.max(confidence, 80);
          matchSource = 'aria-label';
        }
      }

      // Check associated label
      if (confidence < 100 && patterns.label) {
        const labelText = this.getAssociatedLabel(input);
        if (labelText && patterns.label.some(p => p.test(labelText))) {
          confidence = Math.max(confidence, 85);
          matchSource = 'label';
        }
      }

      // Check data attributes
      if (confidence < 100) {
        const dataAttrs = ['data-field', 'data-type', 'data-name'];
        for (const attr of dataAttrs) {
          const val = input.getAttribute(attr);
          if (val && patterns.name && patterns.name.some(p => p.test(val))) {
            confidence = Math.max(confidence, 75);
            matchSource = attr;
          }
        }
      }

      if (confidence > 0) {
        candidates.push({ fieldType, confidence, matchSource });
      }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);

    return candidates.length > 0 ? candidates[0] : null;
  }

  getAssociatedLabel(input) {
    // Check for explicit label with for attribute
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Check for wrapping label
    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent.trim();
    }

    // Check preceding label or text
    const prevSibling = input.previousElementSibling;
    if (prevSibling && prevSibling.tagName === 'LABEL') {
      return prevSibling.textContent.trim();
    }

    // Check for aria-labelledby
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      const parts = labelledBy.split(/\s+/).map(id => {
        const el = document.getElementById(id);
        return el ? el.textContent.trim() : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ');
    }

    // Check parent container for text
    const container = input.closest('.form-group, .field, .input-group, [class*="field"]');
    if (container) {
      const label = container.querySelector('label, .label, [class*="label"]');
      if (label && label !== input) return label.textContent.trim();
    }

    return '';
  }

  findForms() {
    const forms = document.querySelectorAll('form');
    const formCandidates = [];

    forms.forEach(form => {
      const fields = this.detectFields(form);
      if (fields.length > 0) {
        formCandidates.push({ element: form, fields });
      }
    });

    // Also detect form-like containers
    const containers = document.querySelectorAll(
      '[role="form"], [class*="form"], [id*="form"], [class*="checkout"], [class*="register"], [class*="signup"]'
    );

    containers.forEach(container => {
      if (container.tagName === 'FORM') return;
      const fields = this.detectFields(container);
      if (fields.length >= 2) {
        formCandidates.push({ element: container, fields });
      }
    });

    // Detect by field density
    if (formCandidates.length === 0) {
      const allFields = this.detectFields(document);
      if (allFields.length >= 3) {
        formCandidates.push({ element: document.body, fields: allFields });
      }
    }

    return formCandidates;
  }

  getFormFieldsInfo(container) {
    const fields = this.detectFields(container);
    return fields.map(f => ({
      fieldType: f.fieldType,
      confidence: f.confidence,
      tagName: f.element.tagName.toLowerCase(),
      type: f.element.type || '',
      name: f.element.name || '',
      id: f.element.id || '',
      placeholder: f.element.placeholder || '',
      label: this.getAssociatedLabel(f.element)
    }));
  }
}

const fieldDetector = new FieldDetector();
