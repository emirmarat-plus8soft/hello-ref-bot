const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateReferralSubmission(values) {
  const errors = {};

  const name = values.candidate_name?.value?.value?.trim() || '';
  if (!name) {
    errors.candidate_name = 'Please enter the candidate\'s full name.';
  } else if (name.split(/\s+/).filter(Boolean).length < 2) {
    errors.candidate_name = 'Please enter both first and last name.';
  }

  const email = values.candidate_email?.value?.value?.trim() || '';
  if (!email) {
    errors.candidate_email = 'Email is required.';
  } else if (!EMAIL_RE.test(email)) {
    errors.candidate_email = 'Please enter a valid email address.';
  }

  const linkedin = values.candidate_linkedin?.value?.value?.trim() || '';
  if (!linkedin) {
    errors.candidate_linkedin = 'LinkedIn profile URL is required.';
  } else if (!linkedin.includes('linkedin.com/')) {
    errors.candidate_linkedin = 'Please enter a valid LinkedIn URL (must contain linkedin.com/).';
  }

  const profession = values.candidate_profession?.value?.selected_option?.value || '';
  if (!profession) {
    errors.candidate_profession = 'Please select a profession.';
  }

  const cvFiles = values.candidate_cv?.value?.files || [];
  if (cvFiles.length === 0) {
    errors.candidate_cv = 'Please upload the candidate\'s resume.';
  }

  const relation = values.candidate_relation?.value?.value?.trim() || '';
  if (!relation) {
    errors.candidate_relation = 'Please describe how you know this candidate.';
  }

  const fit = values.candidate_fit?.value?.value?.trim() || '';
  if (!fit) {
    errors.candidate_fit = 'Please explain why this candidate is a strong fit.';
  }

  const selectedConsent = (values.candidate_consent?.value?.selected_options || []).map((o) => o.value);
  if (!selectedConsent.includes('aware') || !selectedConsent.includes('open')) {
    errors.candidate_consent = 'Both consent confirmations are required before submitting a referral.';
  }

  return errors;
}

module.exports = { validateReferralSubmission };
