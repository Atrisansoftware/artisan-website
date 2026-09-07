// Mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const isOpen = mobileNav.classList.contains('open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// AI widget close/reopen
const aiWidget = document.getElementById('ai-widget');
const aiWidgetClose = document.getElementById('ai-widget-close');
const aiReopenBtn = document.getElementById('ai-reopen');
if (aiWidgetClose && aiWidget) {
  aiWidgetClose.addEventListener('click', () => {
    aiWidget.style.display = 'none';
    if (aiReopenBtn) aiReopenBtn.style.display = 'inline-flex';
  });
}
if (aiReopenBtn && aiWidget) {
  aiReopenBtn.addEventListener('click', () => {
    aiWidget.style.display = 'block';
    aiReopenBtn.style.display = 'none';
  });
}
// Suggested question buttons -> simple demo response (preserves widget UX without backend)
document.querySelectorAll('.ai-suggestions button').forEach(btn => {
  btn.addEventListener('click', () => {
    const bubble = document.querySelector('.ai-widget-body .ai-bubble');
    if (bubble) {
      bubble.textContent = "Thanks for your question! Our team will help you with: \u201c" + btn.textContent.trim() + "\u201d \u2014 tap Chat Now to continue.";
    }
  });
});

// Content is always visible by default (no scroll-triggered hide/show) to guarantee
// nothing is ever missing — including in static screenshots, PDF export, or if JS fails.

/* =========================================================
   STAGE 3 ADDITIONS — Projects page filtering + detail modal
   (Guarded by element existence so Home/About are unaffected)
   ========================================================= */
(function () {
  const grid = document.getElementById('portfolio-grid');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const emptyState = document.getElementById('portfolio-empty');
  if (!grid) return; // Not the Projects page

  const cards = Array.from(grid.querySelectorAll('.portfolio-card'));

  function applyFilter(category) {
    let visibleCount = 0;
    cards.forEach(card => {
      const match = category === 'all' || card.dataset.category === category;
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (emptyState) emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyFilter(btn.dataset.filter);
    });
  });

  // Project detail modal
  const modal = document.getElementById('project-modal');
  const modalImage = document.getElementById('modal-image');
  const modalBadge = document.getElementById('modal-badge');
  const modalTitle = document.getElementById('modal-title');
  const modalLocation = document.getElementById('modal-location');
  const modalCategory = document.getElementById('modal-category');
  const modalDesc = document.getElementById('modal-desc');
  const modalServices = document.getElementById('modal-services');
  const modalStatus = document.getElementById('modal-status');
  const modalClose = document.getElementById('modal-close');
  let lastFocused = null;

  function openModal(card) {
    if (!modal) return;
    const data = card.dataset;
    modalImage.src = data.image;
    modalImage.alt = data.title;
    modalBadge.textContent = data.categoryLabel;
    modalTitle.textContent = data.title;
    modalLocation.textContent = data.location;
    modalCategory.textContent = data.categoryLabel;
    modalDesc.textContent = data.description;
    if (modalStatus) modalStatus.textContent = data.category === 'ongoing' ? 'Status: Ongoing' : 'Status: Completed';
    modalServices.innerHTML = '';
    (data.services || '').split('|').forEach(s => {
      if (!s) return;
      const span = document.createElement('span');
      span.textContent = s;
      modalServices.appendChild(span);
    });
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  cards.forEach(card => {
    card.addEventListener('click', () => openModal(card));
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card); }
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
    });
  }
})();

/* =========================================================
   Services page — "Explore [Service]" detail modal
   (Guarded by element existence; does not affect other pages)
   ========================================================= */
(function () {
  const modal = document.getElementById('service-modal');
  if (!modal) return; // Not the Services page

  const closeBtn = document.getElementById('service-modal-close');
  const badge = document.getElementById('service-modal-badge');
  const title = document.getElementById('service-modal-title');
  const intro = document.getElementById('service-modal-intro');
  const stepsList = document.getElementById('service-modal-steps');
  let lastFocused = null;

  const content = {
    'house-design': {
      title: 'House Design & Engineering',
      intro: 'From the first sketch to a fully engineered drawing set, our House Design & Engineering service combines architectural creativity with structural precision so your home is both beautiful and safe to build.',
      steps: [
        'Initial consultation to understand your requirements, budget, plot size and lifestyle needs.',
        'Site assessment and measurement to understand orientation, soil conditions and surrounding context.',
        'Architectural concept design — floor plans, elevations and overall layout options for your review.',
        'Structural design and analysis using industry software such as ETABS and STAAD.Pro to size beams, columns and foundations safely.',
        '3D modeling and visualization so you can see how the finished house will look and feel before construction begins.',
        'Interior and exterior design detailing, including material and finish recommendations.',
        'Preparation of complete technical drawings and documentation for construction and permitting.',
        'Client review, revisions and final sign-off before the drawing package is handed over for construction.'
      ]
    },
    'construction': {
      title: 'Construction',
      intro: 'Our Construction service takes an approved design from paper to a finished, quality-built structure — managed by our team from groundbreaking to handover.',
      steps: [
        'Site mobilization — setting up site facilities, safety measures and material logistics.',
        'Foundation work based on the structural design, including excavation and footing/foundation casting.',
        'Superstructure construction — columns, beams, slabs and walls built to specification.',
        'Coordination of electrical, plumbing and other service work alongside the structural build.',
        'Interior and exterior finishing — plastering, flooring, painting and fixtures.',
        'Quality checks at each stage to confirm work matches approved drawings and specifications.',
        'Final walkthrough, snag-list resolution and handover with project documentation.'
      ]
    },
    'supervision': {
      title: 'Project Supervision & Quantity Estimation',
      intro: 'This service keeps a project honest and on track — verifying that construction matches the design, and that materials and costs are accurately measured and controlled throughout.',
      steps: [
        'Reviewing approved drawings to understand the full scope of work before site activity begins.',
        'Regular site supervision visits to monitor progress, workmanship and adherence to specifications.',
        'Quantity take-off from drawings to determine the exact materials and work quantities required.',
        'Preparation of a detailed Bill of Quantities (BOQ) for accurate budgeting and procurement.',
        'Cost estimation and budgeting support so costs are clear before and during construction.',
        'Ongoing measurement and documentation of completed work for billing and record-keeping.',
        'Cost control reporting to keep the client informed of spend against budget throughout the project.'
      ]
    }
  };

  function openModal(key) {
    const data = content[key];
    if (!data || !modal) return;
    badge.textContent = data.title;
    title.textContent = data.title;
    intro.textContent = data.intro;
    stepsList.innerHTML = '';
    data.steps.forEach(step => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      li.textContent = step;
      stepsList.appendChild(li);
    });
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.service-explore-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.service));
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();

/* =========================================================
   STAGE 4 — Shared form handling (mailto-based submission)
   Honest approach: this is a static site with no backend/email
   server configured, so "sending" opens the visitor's own email
   client with a pre-filled message to artisanengineering4@gmail.com.
   ========================================================= */
function validateField(field, input) {
  const val = (input.value || '').trim();
  let ok = true;
  if (input.hasAttribute('required') && !val) ok = false;
  if (ok && input.type === 'email' && val) {
    ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }
  if (ok && input.dataset.phone && val) {
    ok = /^[0-9+\-\s()]{7,}$/.test(val);
  }
  field.classList.toggle('has-error', !ok);
  return ok;
}

function setupMailtoForm(formEl) {
  if (!formEl) return;
  const statusEl = formEl.querySelector('.form-status');
  const toEmail = 'artisanengineering4@gmail.com';
  const FORMSUBMIT_AJAX_URL = 'https://formsubmit.co/ajax/' + toEmail;

  function showStatus(type, msg) {
    if (!statusEl) return;
    statusEl.className = 'form-status show ' + type;
    statusEl.textContent = msg;
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    const fields = Array.from(formEl.querySelectorAll('.form-field'));
    let allValid = true;
    fields.forEach(field => {
      const input = field.querySelector('input, select, textarea');
      if (input && !validateField(field, input)) allValid = false;
    });
    if (!allValid) {
      showStatus('error', 'Please fill in all required fields correctly before submitting.');
      return;
    }

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.setAttribute('disabled', 'disabled');
    showStatus('loading', 'Sending your message...');

    // Build a plain payload object from every labeled field, keyed by its
    // label text, so the email the company receives is readable.
    const payload = {};
    fields.forEach(field => {
      const input = field.querySelector('input, select, textarea');
      const label = field.querySelector('label');
      if (input && input.type !== 'file' && label && input.value.trim()) {
        payload[label.textContent.replace('*', '').trim()] = input.value.trim();
      }
    });
    const fileInput = formEl.querySelector('input[type="file"]');
    if (fileInput && fileInput.files && fileInput.files.length) {
      payload['Attached file (name only — see note)'] = Array.from(fileInput.files).map(f => f.name).join(', ');
    }
    payload._subject = formEl.dataset.subject || 'Website Inquiry — Artisan Engineering and Builders';
    payload._captcha = 'false';
    payload._template = 'table';

    fetch(FORMSUBMIT_AJAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error('formsubmit_error_' + res.status);
        return res.json();
      })
      .then(() => {
        showStatus('success', 'Your message has been sent to Artisan Engineering and Builders. Our team will get back to you soon.');
        formEl.reset();
        const listEl = formEl.querySelector('.upload-filelist');
        if (listEl) listEl.innerHTML = '';
        if (submitBtn) submitBtn.removeAttribute('disabled');
      })
      .catch(() => {
        showStatus('error', 'Your message could not be sent right now. Please try again or contact us directly at +977-9829635328 or artisanengineering4@gmail.com.');
        if (submitBtn) submitBtn.removeAttribute('disabled');
      });
  });

  formEl.querySelectorAll('.form-field input, .form-field select, .form-field textarea').forEach(input => {
    input.addEventListener('blur', () => {
      const field = input.closest('.form-field');
      if (field) validateField(field, input);
    });
  });
}

function setupDropzone(zoneId, inputId, listId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!zone || !input) return;
  const maxSize = parseInt(zone.dataset.maxMb || '10', 10) * 1024 * 1024;

  function renderFiles() {
    if (!list) return;
    list.innerHTML = '';
    Array.from(input.files || []).forEach((f, idx) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      const sizeKb = (f.size / 1024).toFixed(0);
      chip.innerHTML = '<span>' + f.name + ' (' + sizeKb + ' KB)</span>';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '&times;';
      btn.addEventListener('click', () => {
        const dt = new DataTransfer();
        Array.from(input.files).forEach((file, i) => { if (i !== idx) dt.items.add(file); });
        input.files = dt.files;
        renderFiles();
      });
      chip.appendChild(btn);
      list.appendChild(chip);
    });
  }

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      const oversized = Array.from(e.dataTransfer.files).some(f => f.size > maxSize);
      if (oversized) { alert('One or more files exceed the maximum allowed size.'); return; }
      input.files = e.dataTransfer.files;
      renderFiles();
    }
  });
  input.addEventListener('change', () => {
    const oversized = Array.from(input.files).some(f => f.size > maxSize);
    if (oversized) { alert('One or more files exceed the maximum allowed size.'); input.value = ''; return; }
    renderFiles();
  });
}

document.querySelectorAll('form.js-mailto-form').forEach(setupMailtoForm);

/* =========================================================
   Generic "Learn More" info modal (Why Choose Artisan, Careers
   opportunity cards). Reuses the same #info-modal markup pattern
   wherever present on a page.
   ========================================================= */
(function () {
  const modal = document.getElementById('info-modal');
  if (!modal) return;
  const closeBtn = document.getElementById('info-modal-close');
  const titleEl = document.getElementById('info-modal-title');
  const bodyEl = document.getElementById('info-modal-body');
  let lastFocused = null;

  function openInfoModal(title, htmlBody) {
    titleEl.textContent = title;
    bodyEl.innerHTML = htmlBody;
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeInfoModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  document.querySelectorAll('[data-info-title]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoModal(el.dataset.infoTitle, el.dataset.infoBody);
    });
  });
  closeBtn.addEventListener('click', closeInfoModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeInfoModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeInfoModal(); });
})();

/* =========================================================
   Contact page — copy buttons + Request a Quote shortcuts
   ========================================================= */
(function () {
  document.querySelectorAll('.copy-btn[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      navigator.clipboard && navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerHTML;
        btn.innerHTML = '&#10003;';
        setTimeout(() => { btn.innerHTML = original; }, 1500);
      });
    });
  });

  function requestQuote() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const subjectSelect = form.querySelector('select');
    if (subjectSelect) {
      Array.from(subjectSelect.options).forEach(opt => {
        if (opt.textContent.trim() === 'Project Discussion') subjectSelect.value = opt.value;
      });
    }
    form.dataset.subject = 'Quotation Request — Artisan Engineering and Builders';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const nameInput = form.querySelector('input[type="text"]');
    if (nameInput) setTimeout(() => nameInput.focus(), 400);
  }
  const qBtn1 = document.getElementById('request-quote-btn');
  const qBtn2 = document.getElementById('quick-quote-btn');
  if (qBtn1) qBtn1.addEventListener('click', requestQuote);
  if (qBtn2) qBtn2.addEventListener('click', requestQuote);

  setupDropzone('contact-dropzone', 'contact-input', 'contact-filelist');
  setupDropzone('cv-dropzone', 'cv-input', 'cv-filelist');
})();

/* =========================================================
   Engineering Academy — Enrollment modal (shared by academy.html
   and course-detail.html)
   ========================================================= */
(function () {
  const modal = document.getElementById('enroll-modal');
  if (!modal) return;
  const closeBtn = document.getElementById('enroll-modal-close');
  const courseSelect = document.getElementById('enroll-course-select');
  let lastFocused = null;

  function openEnrollModal(courseName) {
    if (courseName && courseSelect) {
      Array.from(courseSelect.options).forEach(opt => {
        if (opt.textContent.trim() === courseName) courseSelect.value = opt.value;
      });
    }
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeEnrollModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-enroll-course]');
    if (btn) openEnrollModal(btn.dataset.enrollCourse);
  });
  const genericBtn = document.getElementById('academy-enroll-btn');
  if (genericBtn) genericBtn.addEventListener('click', () => openEnrollModal(null));

  closeBtn.addEventListener('click', closeEnrollModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeEnrollModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeEnrollModal(); });
})();

/* =========================================================
   Course Detail page — data-driven content from ?course= param
   ========================================================= */
(function () {
  const titleEl = document.getElementById('course-title');
  if (!titleEl) return; // not the course-detail page

  const COURSES = {
    autocad: {
      title: 'AutoCAD',
      image: 'assets/course-autocad.jpg',
      overview: 'Master 2D drafting, 3D modeling and documentation for engineering and architectural projects using industry-standard AutoCAD software.',
      duration: '6 Weeks', certificate: 'Yes, on completion', mode: 'In-person / Hands-on',
      whoFor: 'Engineering students, fresh graduates and drafters who want to build professional 2D and 3D drafting skills for construction and design work.',
      prereq: 'Basic computer literacy. No prior CAD experience required.',
      outcomes: ['Create accurate 2D architectural and engineering drawings', 'Build 3D models and visualizations', 'Prepare layouts, dimensioning and print-ready sheets', 'Work confidently on real drafting projects'],
      modules: ['Introduction to the AutoCAD interface and drawing setup', '2D drafting: lines, layers, blocks and annotations', 'Dimensioning, text and print layout setup', '3D modeling and visualization basics', 'Working on a real-world drafting project'],
      tools: 'AutoCAD (2D &amp; 3D)',
      practical: 'Hands-on drawing exercises in every session, using real project-style drawings.',
      projects: 'Students complete a full drafting project from concept to print-ready output.',
      methodology: 'Instructor-led sessions with guided practice and one-on-one feedback.',
      faq: [
        ['Do I need my own laptop?', 'A computer with AutoCAD installed is recommended; please contact us if you need guidance on software access.'],
        ['Is this course suitable for complete beginners?', 'Yes, the course starts from the fundamentals of the AutoCAD interface.'],
        ['Will I get a certificate?', 'Yes, a certificate of completion is issued at the end of the course.']
      ]
    },
    etabs: {
      title: 'ETABS',
      image: 'assets/course-etabs.jpg',
      overview: 'Learn building analysis, design and detailing using ETABS &mdash; industry-standard software for structural engineering of buildings.',
      duration: '8 Weeks', certificate: 'Yes, on completion', mode: 'In-person / Hands-on',
      whoFor: 'Civil and structural engineering students and graduates who want practical skills in building modeling and structural analysis.',
      prereq: 'Basic understanding of structural engineering concepts (e.g. loads, beams, columns) is recommended.',
      outcomes: ['Model multi-storey buildings in ETABS', 'Run structural and seismic load analysis', 'Interpret analysis results for design decisions', 'Prepare structural design and detailing outputs'],
      modules: ['ETABS interface and building modeling basics', 'Applying loads and load combinations', 'Structural analysis and interpreting results', 'Seismic analysis fundamentals', 'Design and detailing outputs for a sample building'],
      tools: 'ETABS',
      practical: 'Guided modeling of real building configurations in every session.',
      projects: 'A complete multi-storey building model analyzed and designed as a course project.',
      methodology: 'Instructor-led sessions combining theory with software walkthroughs.',
      faq: [
        ['Do I need a structural engineering background?', 'Basic familiarity with structural concepts is helpful but the course covers the essentials needed to follow along.'],
        ['Is ETABS software provided?', 'Please contact us for current guidance on software access for the training.'],
        ['Will I get a certificate?', 'Yes, a certificate of completion is issued at the end of the course.']
      ]
    },
    staad: {
      title: 'STAAD.Pro',
      image: 'assets/course-staad.jpg',
      overview: 'Master structural analysis and design of various engineering structures using STAAD.Pro, a widely used structural analysis platform.',
      duration: '8 Weeks', certificate: 'Yes, on completion', mode: 'In-person / Hands-on',
      whoFor: 'Civil and structural engineering students and graduates looking to build practical structural analysis and design skills.',
      prereq: 'Basic understanding of structural engineering concepts is recommended.',
      outcomes: ['Model various structure types in STAAD.Pro', 'Perform load analysis and interpret results', 'Design and optimize structural members', 'Apply steel and concrete design principles'],
      modules: ['STAAD.Pro interface and structure modeling', 'Load application and analysis', 'Design and optimization workflow', 'Steel design fundamentals', 'Concrete design fundamentals'],
      tools: 'STAAD.Pro',
      practical: 'Hands-on modeling and analysis exercises throughout the course.',
      projects: 'A structural design project completed from modeling through to design output.',
      methodology: 'Instructor-led sessions with guided practice on real structural examples.',
      faq: [
        ['Is this course only for structural engineers?', 'It is designed primarily for civil/structural students and professionals, but motivated learners from related fields are welcome.'],
        ['Will I get a certificate?', 'Yes, a certificate of completion is issued at the end of the course.'],
        ['Are classes in-person?', 'Yes, training is conducted with hands-on, in-person sessions.']
      ]
    },
    estimation: {
      title: 'Quantity Estimation',
      image: 'assets/course-estimation.jpg',
      overview: 'Learn accurate quantity takeoff, BOQ preparation and cost planning &mdash; core skills for construction cost estimation and project budgeting.',
      duration: '4 Weeks', certificate: 'Yes, on completion', mode: 'In-person / Hands-on',
      whoFor: 'Civil engineering students, graduates and site staff who want practical skills in quantity surveying and cost estimation.',
      prereq: 'Basic understanding of construction drawings is helpful but not required.',
      outcomes: ['Perform accurate quantity takeoff from drawings', 'Prepare a Bill of Quantities (BOQ)', 'Carry out rate analysis for construction items', 'Estimate and plan project costs'],
      modules: ['Reading drawings for quantity takeoff', 'Quantity takeoff methods for common building elements', 'BOQ preparation and formatting', 'Rate analysis fundamentals', 'Cost estimation and budgeting practice'],
      tools: 'Spreadsheet-based estimation tools',
      practical: 'Practice takeoff and BOQ preparation using real drawing examples.',
      projects: 'A complete BOQ and cost estimate prepared for a sample building project.',
      methodology: 'Instructor-led sessions combining worked examples with guided practice.',
      faq: [
        ['Do I need software experience?', 'Basic spreadsheet familiarity is helpful; the course teaches the estimation methods themselves.'],
        ['Will I get a certificate?', 'Yes, a certificate of completion is issued at the end of the course.'],
        ['Is this useful for site supervisors too?', 'Yes, site staff involved in measurement and billing will find this course directly relevant.']
      ]
    }
  };

  const params = new URLSearchParams(window.location.search);
  const key = (params.get('course') || 'autocad').toLowerCase();
  const data = COURSES[key] || COURSES.autocad;

  document.title = data.title + ' Course | Artisan Engineering Academy';
  document.getElementById('course-crumb').textContent = data.title;
  titleEl.textContent = data.title;
  document.getElementById('course-overview').textContent = data.overview.replace(/&mdash;/g, '\u2014');
  document.getElementById('course-photo').src = data.image;
  document.getElementById('course-photo').alt = data.title + ' course';
  document.getElementById('course-duration').textContent = data.duration;
  document.getElementById('course-certificate').textContent = data.certificate;
  document.getElementById('course-mode').textContent = data.mode;
  document.getElementById('course-who-for').textContent = data.whoFor;
  document.getElementById('course-prereq').textContent = data.prereq;
  document.getElementById('course-tools').innerHTML = data.tools;
  document.getElementById('course-practical').textContent = data.practical;
  document.getElementById('course-projects').textContent = data.projects;
  document.getElementById('course-methodology').textContent = data.methodology;
  document.getElementById('course-cta-heading').textContent = 'Ready to Enroll in ' + data.title + '?';

  const outcomesList = document.getElementById('course-outcomes');
  data.outcomes.forEach(o => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="check">&#10003;</span> ' + o;
    outcomesList.appendChild(li);
  });

  const modulesWrap = document.getElementById('course-modules');
  data.modules.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'service-detail-card';
    card.style.cssText = 'display:flex; align-items:center; gap:16px; padding:16px 20px;';
    card.innerHTML = '<span style="flex-shrink:0; width:34px; height:34px; border-radius:50%; background:var(--blue-50); color:var(--blue-700); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px;">' + (i + 1) + '</span><span style="font-size:13.5px; color:var(--ink);">' + m + '</span>';
    modulesWrap.appendChild(card);
  });

  const faqWrap = document.getElementById('course-faq');
  data.faq.forEach(([q, a]) => {
    const item = document.createElement('details');
    item.style.cssText = 'border:1px solid var(--gray-200); border-radius:10px; padding:14px 16px;';
    item.innerHTML = '<summary style="cursor:pointer; font-weight:600; color:var(--navy-900); font-size:13.5px;">' + q + '</summary><p style="margin:10px 0 0; font-size:13px; color:var(--ink-soft);">' + a + '</p>';
    faqWrap.appendChild(item);
  });

  document.getElementById('course-enroll-btn').setAttribute('data-enroll-course', data.title);
  document.getElementById('course-enroll-btn-2').setAttribute('data-enroll-course', data.title);
})();

/* =========================================================
   ARTISAN AI v2 — chat, real tools, file handling, image
   generation via Puter.js, theme/fullscreen, send-details.
   Honest architecture: tries the real company backend first,
   falls back to Puter.js (real, free, no-key AI) if unreachable,
   and only ever shows a plain apology if both genuinely fail.
   ========================================================= */
(function () {
  const chatWindow = document.getElementById('chat-window');
  if (!chatWindow) return; // not the Artisan AI page

  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const welcome = document.getElementById('ai-welcome');
  const suggestionGrid = document.getElementById('ai-suggestion-grid');
  let chatHistory = JSON.parse(sessionStorage.getItem('artisanAiHistory') || '[]');
  let projectContext = null;

  function hideWelcome() {
    if (welcome) welcome.style.display = 'none';
    if (suggestionGrid) suggestionGrid.style.display = 'none';
  }
  function showWelcome() {
    if (welcome) welcome.style.display = '';
    if (suggestionGrid) suggestionGrid.style.display = '';
  }

  function addMsg(role, text) {
    hideWelcome();
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.textContent = text;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
  }

  function saveHistory(userText, aiText) {
    chatHistory.push({ user: userText, ai: aiText, at: new Date().toLocaleString() });
    sessionStorage.setItem('artisanAiHistory', JSON.stringify(chatHistory));
  }

  async function callBackend(message, historyForApi, context) {
    const res = await fetch('/api/artisan-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: historyForApi, projectContext: context }),
    });
    if (!res.ok) throw new Error('backend_error_' + res.status);
    const data = await res.json();
    if (!data.reply) throw new Error('backend_empty_reply');
    return data;
  }

  async function callPuterFallback(message, historyForApi) {
    if (!window.puter || !window.puter.ai || !window.puter.ai.chat) throw new Error('puter_unavailable');
    const messages = [
      { role: 'system', content: 'You are Artisan AI, the engineering assistant for Artisan Engineering and Builders Pvt. Ltd., a civil engineering, construction and technical training company in Nepalgunj, Banke, Nepal. Be helpful, concise and honest. You do not have live prices or current regulations — say so if asked. For direct contact, share +977-9829635328 or artisanengineering4@gmail.com.' },
      ...historyForApi,
      { role: 'user', content: message },
    ];
    const response = await window.puter.ai.chat(messages);
    const text = response?.message?.content ?? response?.text ?? (typeof response === 'string' ? response : null);
    if (!text) throw new Error('puter_empty_reply');
    return { reply: text, projectContext: null };
  }

  function sendMessage(text) {
    const val = (text || chatInput.value || '').trim();
    if (!val) return;
    addMsg('user', val);
    chatInput.value = '';
    const loadingEl = addMsg('ai', 'Thinking...');

    const historyForApi = chatHistory.slice(-10).flatMap(h => ([
      { role: 'user', content: h.user },
      { role: 'assistant', content: h.ai },
    ]));

    callBackend(val, historyForApi, projectContext)
      .then(data => {
        loadingEl.textContent = data.reply;
        if (data.projectContext) projectContext = data.projectContext;
        saveHistory(val, data.reply);
      })
      .catch(() => {
        callPuterFallback(val, historyForApi)
          .then(data => {
            loadingEl.textContent = data.reply;
            saveHistory(val, data.reply);
          })
          .catch(() => {
            const msg = "I couldn't reach Artisan AI's servers or the backup AI service just now. Please try again in a moment, use the Tools in the sidebar (Unit Converter, BOQ Analyzer, Calculations — these work with no connection at all), or reach our team directly via the account icon above.";
            loadingEl.textContent = msg;
            saveHistory(val, msg);
          });
      });
  }
  chatSend.addEventListener('click', () => sendMessage());
  chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

  document.getElementById('nav-new-chat').addEventListener('click', () => {
    chatWindow.innerHTML = '';
    showWelcome();
    document.querySelectorAll('.ai-nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-new-chat').classList.add('active');
  });

  document.getElementById('nav-history').addEventListener('click', () => {
    hideWelcome();
    if (chatHistory.length === 0) {
      addMsg('ai', 'No previous chats yet in this session.');
    } else {
      addMsg('ai', 'This session has ' + chatHistory.length + ' previous message(s). Most recent: "' + chatHistory[chatHistory.length - 1].user + '"');
    }
  });
  document.getElementById('nav-drafts').addEventListener('click', () => {
    hideWelcome();
    addMsg('ai', 'Drafts are saved locally in your session as you work — none yet.');
  });
  document.getElementById('nav-saved').addEventListener('click', () => {
    hideWelcome();
    addMsg('ai', 'Saved results will appear here once you save an output from a tool.');
  });

  /* ---------- File handling (real client-side reading where possible) ---------- */
  const aiFileInput = document.getElementById('ai-file-input');

  function humanSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleFiles(files) {
    hideWelcome();
    Array.from(files).forEach(file => {
      addMsg('user', 'Uploaded: ' + file.name);
      const note = addMsg('ai', 'Reading file...');
      if (/text\/plain/.test(file.type) || /\.txt$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = () => {
          const content = String(reader.result || '');
          const words = content.trim().split(/\s+/).filter(Boolean).length;
          const preview = content.slice(0, 220).trim();
          note.textContent = 'Read "' + file.name + '": ' + words + ' words. Preview: "' + preview + (content.length > 220 ? '...' : '') + '"';
        };
        reader.readAsText(file);
      } else {
        note.textContent = 'Received "' + file.name + '" (' + humanSize(file.size) + ', ' + (file.type || 'unknown type') + '). Full content analysis for this file type needs a connected AI backend with document/image parsing, which this environment may not have configured — but the file details above are real.';
      }
    });
  }
  aiFileInput.addEventListener('change', () => { if (aiFileInput.files.length) handleFiles(aiFileInput.files); });

  document.getElementById('nav-files').addEventListener('click', () => aiFileInput.click());
  document.getElementById('sugg-analyze-drawing').addEventListener('click', () => aiFileInput.click());
  document.getElementById('sugg-read-document').addEventListener('click', () => aiFileInput.click());
  document.getElementById('ai-attach-file').addEventListener('click', () => aiFileInput.click());
  document.getElementById('ai-attach-image').addEventListener('click', () => aiFileInput.click());

  /* ---------- Top bar: theme, fullscreen, user popover ---------- */
  const shell = document.getElementById('ai-page-shell');
  document.getElementById('ai-theme-toggle').addEventListener('click', () => {
    shell.classList.toggle('ai-dark');
  });
  document.getElementById('ai-fullscreen-toggle').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      shell.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  });
  const userPopover = document.getElementById('ai-user-popover');
  document.getElementById('ai-user-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    userPopover.classList.toggle('open');
  });
  document.addEventListener('click', () => userPopover.classList.remove('open'));

  /* ---------- Send My Details (real FormSubmit send) ---------- */
  const detailsModal = document.getElementById('details-modal');
  const detailsClose = document.getElementById('details-modal-close');
  function openDetailsModal() {
    detailsModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    detailsClose.focus();
  }
  function closeDetailsModal() {
    detailsModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('ai-send-details').addEventListener('click', openDetailsModal);
  detailsClose.addEventListener('click', closeDetailsModal);
  detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) closeDetailsModal(); });

  /* ---------- Tool workspace modal ---------- */
  const toolModal = document.getElementById('tool-modal');
  const toolTitle = document.getElementById('tool-modal-title');
  const toolBody = document.getElementById('tool-modal-body');
  const toolClose = document.getElementById('tool-modal-close');

  function openTool(title, bodyHtml, afterRender) {
    toolTitle.textContent = title;
    toolBody.innerHTML = bodyHtml;
    toolModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    toolClose.focus();
    if (afterRender) afterRender();
  }
  function closeTool() {
    toolModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  toolClose.addEventListener('click', closeTool);
  toolModal.addEventListener('click', (e) => { if (e.target === toolModal) closeTool(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeTool(); closeDetailsModal(); }
  });

  const UNITS = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, yd: 0.9144, mile: 1609.34 },
    Area: { 'm\u00b2': 1, 'ft\u00b2': 0.092903, ropani: 508.72, aana: 31.795, katha: 338.63, bigha: 6772.6 },
    Volume: { 'm\u00b3': 1, 'ft\u00b3': 0.0283168, litre: 0.001, gallon: 0.00378541 },
    Weight: { kg: 1, ton: 1000, lb: 0.453592, quintal: 100 },
  };

  const TOOLS = {
    converter() {
      openTool('Unit Converter', `
        <div class="form-grid">
          <div class="form-field"><label>Category</label><select id="uc-cat">${Object.keys(UNITS).map(c => `<option>${c}</option>`).join('')}</select></div>
          <div class="form-field"><label>Value</label><input type="number" id="uc-value" value="1"></div>
          <div class="form-field"><label>From Unit</label><select id="uc-from"></select></div>
          <div class="form-field"><label>To Unit</label><select id="uc-to"></select></div>
        </div>
        <div class="tool-result show" id="uc-result"><div class="lbl">Result</div><div class="big" id="uc-big">&mdash;</div></div>
      `, () => {
        const cat = document.getElementById('uc-cat');
        const from = document.getElementById('uc-from');
        const to = document.getElementById('uc-to');
        const val = document.getElementById('uc-value');
        const big = document.getElementById('uc-big');
        function fillUnits() {
          const units = Object.keys(UNITS[cat.value]);
          from.innerHTML = units.map(u => `<option>${u}</option>`).join('');
          to.innerHTML = units.map(u => `<option>${u}</option>`).join('');
          to.selectedIndex = Math.min(1, units.length - 1);
          compute();
        }
        function compute() {
          const table = UNITS[cat.value];
          const base = parseFloat(val.value || '0') * table[from.value];
          const result = base / table[to.value];
          big.textContent = (isFinite(result) ? result.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0') + ' ' + to.value;
        }
        cat.addEventListener('change', fillUnits);
        [from, to, val].forEach(el => el.addEventListener('input', compute));
        fillUnits();
      });
    },
    calc() {
      openTool('Quantity Calculations', `
        <div class="form-field"><label>Calculation Type</label>
          <select id="calc-type">
            <option value="area">Rectangular Area</option>
            <option value="volume">Rectangular Volume (e.g. concrete)</option>
            <option value="brick">Brickwork Quantity (approx.)</option>
            <option value="plaster">Plaster Quantity (approx.)</option>
          </select>
        </div>
        <div class="form-grid" id="calc-fields" style="margin-top:14px;"></div>
        <div class="tool-result show" id="calc-result"><div class="lbl">Result</div><div class="big" id="calc-big">&mdash;</div><div class="lbl" id="calc-note" style="margin-top:6px;"></div></div>
      `, () => {
        const typeSel = document.getElementById('calc-type');
        const fields = document.getElementById('calc-fields');
        const big = document.getElementById('calc-big');
        const note = document.getElementById('calc-note');
        function render() {
          if (typeSel.value === 'area') {
            fields.innerHTML = `<div class="form-field"><label>Length (m)</label><input type="number" id="c1" value="5"></div><div class="form-field"><label>Width (m)</label><input type="number" id="c2" value="4"></div>`;
          } else if (typeSel.value === 'volume') {
            fields.innerHTML = `<div class="form-field"><label>Length (m)</label><input type="number" id="c1" value="5"></div><div class="form-field"><label>Width (m)</label><input type="number" id="c2" value="4"></div><div class="form-field"><label>Depth/Height (m)</label><input type="number" id="c3" value="0.15"></div>`;
          } else if (typeSel.value === 'brick') {
            fields.innerHTML = `<div class="form-field"><label>Wall Length (m)</label><input type="number" id="c1" value="5"></div><div class="form-field"><label>Wall Height (m)</label><input type="number" id="c2" value="3"></div><div class="form-field"><label>Wall Thickness (m)</label><input type="number" id="c3" value="0.23"></div>`;
          } else {
            fields.innerHTML = `<div class="form-field"><label>Area (m&sup2;)</label><input type="number" id="c1" value="20"></div><div class="form-field"><label>Plaster Thickness (mm)</label><input type="number" id="c2" value="12"></div>`;
          }
          fields.querySelectorAll('input').forEach(inp => inp.addEventListener('input', compute));
          compute();
        }
        function compute() {
          const v = id => parseFloat(document.getElementById(id) && document.getElementById(id).value || '0');
          if (typeSel.value === 'area') {
            const r = v('c1') * v('c2');
            big.textContent = r.toLocaleString(undefined, { maximumFractionDigits: 3 }) + ' m\u00b2';
            note.textContent = 'Length \u00d7 Width';
          } else if (typeSel.value === 'volume') {
            const r = v('c1') * v('c2') * v('c3');
            big.textContent = r.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' m\u00b3';
            note.textContent = 'Length \u00d7 Width \u00d7 Depth &mdash; verify mix ratio and wastage allowance with your engineer.';
          } else if (typeSel.value === 'brick') {
            const volume = v('c1') * v('c2') * v('c3');
            const bricksPerM3 = 500;
            const r = volume * bricksPerM3;
            big.textContent = Math.round(r).toLocaleString() + ' bricks (approx.)';
            note.textContent = 'Wall volume \u00d7 ~' + bricksPerM3 + ' bricks/m\u00b3 (typical estimate) &mdash; verify with your engineer for exact brick size and mortar ratio.';
          } else {
            const areaM2 = v('c1');
            const thicknessM = v('c2') / 1000;
            const r = areaM2 * thicknessM;
            big.textContent = r.toLocaleString(undefined, { maximumFractionDigits: 4 }) + ' m\u00b3 of plaster mix';
            note.textContent = 'Area \u00d7 Thickness &mdash; add ~10% for wastage; verify mix ratio with your engineer.';
          }
        }
        typeSel.addEventListener('change', render);
        render();
      });
    },
    estimate() {
      openTool('Project Estimation', `
        <div class="form-grid">
          <div class="form-field"><label>Project Type</label>
            <select id="es-type">
              <option value="15000">Residential House (approx. NPR 15,000/sq.ft)</option>
              <option value="18000">Commercial Building (approx. NPR 18,000/sq.ft)</option>
              <option value="8000">Renovation Work (approx. NPR 8,000/sq.ft)</option>
            </select>
          </div>
          <div class="form-field"><label>Built-up Area (sq.ft)</label><input type="number" id="es-area" value="1500"></div>
        </div>
        <div class="tool-result show" id="es-result"><div class="lbl">Rough Estimate</div><div class="big" id="es-big">&mdash;</div><div class="lbl" style="margin-top:6px;">This is a very rough order-of-magnitude figure only, based on general per-sq.ft rates &mdash; actual cost depends heavily on design, finishes, site conditions and materials. Please request a detailed quotation for an accurate number.</div></div>
      `, () => {
        const typeSel = document.getElementById('es-type');
        const areaInp = document.getElementById('es-area');
        const big = document.getElementById('es-big');
        function compute() {
          const rate = parseFloat(typeSel.value);
          const area = parseFloat(areaInp.value || '0');
          const total = rate * area;
          big.textContent = 'NPR ' + Math.round(total).toLocaleString();
        }
        typeSel.addEventListener('change', compute);
        areaInp.addEventListener('input', compute);
        compute();
      });
    },
    boq() {
      openTool('BOQ Analyzer', `
        <p class="desc" style="margin-bottom:10px;">Enter your Bill of Quantities items below — totals are calculated live.</p>
        <table class="boq-table" id="boq-table">
          <thead><tr><th>Item</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
          <tbody id="boq-body"></tbody>
          <tfoot><tr><td colspan="4">Total</td><td id="boq-total">0</td><td></td></tr></tfoot>
        </table>
        <button type="button" class="btn btn-outline btn-sm" id="boq-add" style="margin-top:12px;">+ Add Item</button>
      `, () => {
        const body = document.getElementById('boq-body');
        const totalCell = document.getElementById('boq-total');
        function addRow(item = '', unit = '', qty = '', rate = '') {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td><input value="${item}" placeholder="e.g. Cement concrete"></td><td><input value="${unit}" placeholder="m\u00b3" style="width:60px;"></td><td><input type="number" value="${qty}" style="width:70px;" class="qty"></td><td><input type="number" value="${rate}" style="width:80px;" class="rate"></td><td class="amount">0</td><td><button type="button" style="border:none;background:none;color:#d93025;cursor:pointer;">&times;</button></td>`;
          tr.querySelectorAll('.qty, .rate').forEach(inp => inp.addEventListener('input', recompute));
          tr.querySelector('button').addEventListener('click', () => { tr.remove(); recompute(); });
          body.appendChild(tr);
        }
        function recompute() {
          let total = 0;
          body.querySelectorAll('tr').forEach(tr => {
            const qty = parseFloat(tr.querySelector('.qty').value || '0');
            const rate = parseFloat(tr.querySelector('.rate').value || '0');
            const amount = qty * rate;
            tr.querySelector('.amount').textContent = amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
            total += amount;
          });
          totalCell.textContent = total.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        document.getElementById('boq-add').addEventListener('click', () => addRow());
        addRow('Cement Concrete (1:2:4)', 'm\u00b3', 10, 12000);
        addRow('Brickwork', 'm\u00b3', 15, 8500);
        recompute();
      });
    },
    material() {
      openTool('Material Advisor', `
        <div class="form-grid">
          <div class="form-field"><label>Project Type</label><select id="ma-type"><option>Residential House</option><option>Commercial Building</option><option>Renovation</option></select></div>
          <div class="form-field"><label>Priority</label><select id="ma-priority"><option>Budget</option><option>Durability</option><option>Sustainability</option></select></div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="ma-run" style="margin-top:12px;">Get Recommendation</button>
        <div class="tool-result" id="ma-result"><div class="lbl">General Guidance</div><p id="ma-text" style="font-size:13px; color:var(--ink); margin:6px 0 0;"></p></div>
      `, () => {
        const RULES = {
          'Residential House|Budget': 'Consider standard fired clay bricks, local aggregate concrete and cement plaster finishes — cost-effective and widely available. Verify structural adequacy with your engineer.',
          'Residential House|Durability': 'Consider higher-grade concrete, quality reinforcement steel and weather-resistant exterior finishes for long-term performance.',
          'Residential House|Sustainability': 'Consider fly-ash blended cement, locally sourced materials, and good insulation/ventilation design to reduce long-term energy use.',
          'Commercial Building|Budget': 'Standard reinforced concrete framing with efficient, repeatable structural grids typically balances cost and performance well.',
          'Commercial Building|Durability': 'Consider higher-grade concrete and corrosion-resistant reinforcement detailing, especially at exposed elements.',
          'Commercial Building|Sustainability': 'Consider energy-efficient glazing, natural lighting/ventilation design, and sustainably sourced materials.',
          'Renovation|Budget': 'Reuse sound existing structural elements where verified safe, and focus new material spend on finishes and functional upgrades.',
          'Renovation|Durability': 'Prioritize addressing any structural or moisture issues first before finishes, using durable, low-maintenance materials.',
          'Renovation|Sustainability': 'Consider reusing existing structure where possible and choosing low-impact finish materials.',
        };
        document.getElementById('ma-run').addEventListener('click', () => {
          const type = document.getElementById('ma-type').value;
          const priority = document.getElementById('ma-priority').value;
          const text = RULES[type + '|' + priority] || 'Please select a project type and priority.';
          document.getElementById('ma-result').classList.add('show');
          document.getElementById('ma-text').textContent = text + ' This is general guidance only — please have final material choices verified by a qualified engineer.';
        });
      });
    },
    'image-gen'() {
      openTool('Image Generation', `
        <div class="form-field"><label>Describe the image you want</label><textarea id="ig-prompt" placeholder="e.g. Modern two-storey house with glass facade and flat roof, evening light"></textarea></div>
        <button type="button" class="btn btn-primary btn-sm" id="ig-generate" style="margin-top:10px;">Generate <span>&rarr;</span></button>
        <div class="tool-result" id="ig-result">
          <div class="lbl" id="ig-status">Generating your image...</div>
          <div id="ig-image-wrap" style="margin-top:10px;"></div>
          <button type="button" class="btn btn-outline btn-sm" id="ig-download" style="display:none; margin-top:10px;">Download Image</button>
        </div>
      `, () => {
        document.getElementById('ig-generate').addEventListener('click', async () => {
          const prompt = document.getElementById('ig-prompt').value.trim();
          const resultBox = document.getElementById('ig-result');
          const status = document.getElementById('ig-status');
          const wrap = document.getElementById('ig-image-wrap');
          const dlBtn = document.getElementById('ig-download');
          if (!prompt) { alert('Please enter a description first.'); return; }
          resultBox.classList.add('show');
          wrap.innerHTML = '';
          dlBtn.style.display = 'none';
          status.textContent = 'Generating your image with AI — this can take a few seconds...';
          try {
            if (!window.puter || !window.puter.ai || !window.puter.ai.txt2img) {
              throw new Error('puter_image_unavailable');
            }
            const imgEl = await window.puter.ai.txt2img(prompt);
            let src = null;
            if (imgEl && imgEl.tagName === 'IMG') {
              src = imgEl.src;
              imgEl.style.maxWidth = '100%';
              imgEl.style.borderRadius = '10px';
              wrap.appendChild(imgEl);
            } else if (typeof imgEl === 'string') {
              src = imgEl;
              const im = document.createElement('img');
              im.src = imgEl;
              im.style.maxWidth = '100%';
              im.style.borderRadius = '10px';
              wrap.appendChild(im);
            } else {
              throw new Error('puter_image_bad_response');
            }
            status.textContent = 'Here\'s your generated image for: "' + prompt + '"';
            if (src) {
              dlBtn.style.display = 'inline-flex';
              dlBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = src;
                a.download = 'artisan-ai-image.png';
                a.target = '_blank';
                a.click();
              };
            }
          } catch (err) {
            status.textContent = 'Image generation could not complete right now (the AI image service may be unavailable in this environment). Please try again in a moment.';
          }
        });
      });
    },
  };

  document.querySelectorAll('[data-tool]').forEach(el => {
    el.addEventListener('click', () => {
      const fn = TOOLS[el.dataset.tool];
      if (fn) fn();
    });
  });
})();
