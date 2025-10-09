-- Create demo data for Klarsynt Test organization for onboarding tour
-- All demo entries are marked with patient_identifier starting with 'DEMO-' for easy cleanup

DO $$
DECLARE
  v_org_id TEXT;
  v_form_id UUID;
  v_store_id UUID;
  v_optician_id TEXT;
  v_entry_id_1 UUID;
  v_entry_id_2 UUID;
  v_entry_id_3 UUID;
  v_entry_id_4 UUID;
  v_entry_id_5 UUID;
BEGIN
  -- Get Klarsynt Test organization ID (updated to match actual name)
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Klarsynt Test' LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Klarsynt Test organization not found, skipping demo data creation';
    RETURN;
  END IF;

  -- Get a form and store for Klarsynt Test
  SELECT id INTO v_form_id FROM anamnes_forms WHERE organization_id = v_org_id AND is_active = true LIMIT 1;
  SELECT id INTO v_store_id FROM stores WHERE organization_id = v_org_id LIMIT 1;
  
  -- Get an optician from the organization (if exists)
  SELECT clerk_user_id INTO v_optician_id FROM users WHERE organization_id = v_org_id AND role = 'optician' LIMIT 1;

  -- Create 5 demo anamnesis entries
  
  -- Entry 1: Ready status, with booking today
  v_entry_id_1 := gen_random_uuid();
  INSERT INTO anamnes_entries (
    id, organization_id, form_id, store_id, status, 
    patient_identifier, first_name, examination_type,
    consent_given, consent_timestamp, 
    created_at, sent_at, booking_date,
    answers, formatted_raw_data
  ) VALUES (
    v_entry_id_1, v_org_id, v_form_id, v_store_id, 'ready',
    'DEMO-001', 'Anna', 'Körkortsundersökning',
    true, NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NOW() + INTERVAL '2 hours',
    jsonb_build_object(
      'personalNumber', '19900101-1234',
      'licenseCategory', 'B',
      'currentVision', 'Har inga glasögon',
      'healthConditions', 'Inga kända ögonsjukdomar'
    ),
    'Personuppgifter: Anna, 19900101-1234\nKörkortskategori: B\nSynstatus: Har inga glasögon\nHälsa: Inga kända ögonsjukdomar'
  );

  -- Entry 2: Submitted status
  v_entry_id_2 := gen_random_uuid();
  INSERT INTO anamnes_entries (
    id, organization_id, form_id, store_id, status, optician_id,
    patient_identifier, first_name, examination_type,
    consent_given, consent_timestamp,
    created_at, sent_at,
    answers, formatted_raw_data
  ) VALUES (
    v_entry_id_2, v_org_id, v_form_id, v_store_id, 'submitted', v_optician_id,
    'DEMO-002', 'Erik', 'Synundersökning',
    true, NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
    jsonb_build_object(
      'visionProblems', 'Suddig syn på avstånd',
      'previousGlasses', 'Ja, sedan 2 år',
      'eyeStrain', 'Ofta huvudvärk vid datorarbete',
      'medications', 'Inga'
    ),
    'Besvär: Suddig syn på avstånd\nTidigare glasögon: Ja, sedan 2 år\nÖgontrötthet: Ofta huvudvärk vid datorarbete\nMediciner: Inga'
  );

  -- Entry 3: Journaled status with AI summary
  v_entry_id_3 := gen_random_uuid();
  INSERT INTO anamnes_entries (
    id, organization_id, form_id, store_id, status, optician_id,
    patient_identifier, first_name, examination_type,
    consent_given, consent_timestamp, id_verification_completed, verified_at,
    created_at, sent_at,
    answers, formatted_raw_data, ai_summary
  ) VALUES (
    v_entry_id_3, v_org_id, v_form_id, v_store_id, 'journaled', v_optician_id,
    'DEMO-003', 'Maria', 'Körkortsundersökning',
    true, NOW() - INTERVAL '2 days', true, NOW() - INTERVAL '1 day 23 hours',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
    jsonb_build_object(
      'personalNumber', '19850515-5678',
      'licenseCategory', 'B',
      'currentVision', 'Använder glasögon dagligen',
      'lastEyeExam', 'För 3 år sedan',
      'healthConditions', 'Diabetes typ 2, kontrollerad'
    ),
    'Personuppgifter: Maria, 19850515-5678\nKörkortskategori: B\nSynstatus: Använder glasögon dagligen\nSenaste synundersökning: För 3 år sedan\nHälsa: Diabetes typ 2, kontrollerad',
    'Patient genomgick körkortsundersökning. Synschärpa uppfyller kraven för körkortskategori B med korrektion. ID-verifiering genomförd. Diabetes typ 2 noterad men väl kontrollerad, inga retinopatiförändringar observerade. Godkänd för körkortstillstånd med villkor om glasögon.'
  );

  -- Create driving license examination for Entry 3
  INSERT INTO driving_license_examinations (
    entry_id, organization_id, 
    personal_number, id_type, id_verification_completed, verified_at,
    visual_acuity_right_eye, visual_acuity_left_eye, visual_acuity_both_eyes,
    visual_acuity_with_correction_right, visual_acuity_with_correction_left, visual_acuity_with_correction_both,
    uses_glasses, correction_type,
    examination_status, passed_examination,
    optician_decision, optician_decision_date, optician_notes
  ) VALUES (
    v_entry_id_3, v_org_id,
    '19850515-5678', 'id_kort', true, NOW() - INTERVAL '1 day 23 hours',
    0.8, 0.7, 0.9,
    1.0, 1.0, 1.2,
    true, 'glasses',
    'completed', true,
    'Godkänd med korrektion. Synschärpa uppfyller kraven.', NOW() - INTERVAL '1 day 23 hours',
    'Diabetes kontrollerad, inga synpåverkan.'
  );

  -- Entry 4: Reviewed status with AI summary
  v_entry_id_4 := gen_random_uuid();
  INSERT INTO anamnes_entries (
    id, organization_id, form_id, store_id, status,
    patient_identifier, first_name, examination_type,
    consent_given, consent_timestamp,
    created_at, sent_at,
    answers, formatted_raw_data, ai_summary
  ) VALUES (
    v_entry_id_4, v_org_id, v_form_id, v_store_id, 'reviewed',
    'DEMO-004', 'Johan', 'Linsanpassning',
    true, NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
    jsonb_build_object(
      'lensExperience', 'Ny linsbärare',
      'lensType', 'Mjuka dagslinser',
      'activities', 'Sport och träning 4 gånger/vecka',
      'allergies', 'Inga kända allergier'
    ),
    'Linserfarenhet: Ny linsbärare\nÖnskad linstyp: Mjuka dagslinser\nAktiviteter: Sport och träning 4 gånger/vecka\nAllergier: Inga kända allergier',
    'Patient önskar linsanpassning för första gången. Intresserad av mjuka dagslinser för sport och träning. Inga allergier eller kontraindikationer. Rekommendation: Börja med 1-Day Acuvue Moist, instruktion om användning och skötsel vid besök.'
  );

  -- Entry 5: Sent status (waiting for patient to complete)
  v_entry_id_5 := gen_random_uuid();
  INSERT INTO anamnes_entries (
    id, organization_id, form_id, store_id, status,
    patient_identifier, examination_type,
    created_at, sent_at, expires_at,
    access_token
  ) VALUES (
    v_entry_id_5, v_org_id, v_form_id, v_store_id, 'sent',
    'DEMO-005', 'Synundersökning',
    NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', NOW() + INTERVAL '7 days',
    encode(gen_random_bytes(32), 'hex')
  );

  RAISE NOTICE 'Successfully created 5 demo anamnesis entries for Klarsynt Test organization';
  RAISE NOTICE 'All demo entries are marked with patient_identifier starting with "DEMO-" for easy cleanup';
  
END $$;

-- To clean up demo data later, run:
-- DELETE FROM driving_license_examinations WHERE entry_id IN (SELECT id FROM anamnes_entries WHERE patient_identifier LIKE 'DEMO-%');
-- DELETE FROM anamnes_entries WHERE patient_identifier LIKE 'DEMO-%';