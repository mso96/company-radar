ALTER TABLE agency_radars ADD COLUMN cities_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE agency_radars ADD COLUMN segment_slugs_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE agency_radars ADD COLUMN service_focus_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE agency_template_library ADD COLUMN service_focus_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE agency_letter_templates ADD COLUMN service_focus_json TEXT NOT NULL DEFAULT '[]';

UPDATE agency_template_library SET service_focus_json = CASE segment_slug
  WHEN 'accounting-bookkeeping' THEN '["Bookkeeping","Payroll","VAT returns","Year-end accounts","Tax planning"]'
  WHEN 'legal-services' THEN '["Incorporation","Commercial contracts","Employment agreements","IP protection","Compliance"]'
  WHEN 'property-services' THEN '["Conveyancing","Property management","Landlord support","Valuation","Commercial property advice"]'
  WHEN 'digital-agencies' THEN '["Website launch","Branding","SEO","Paid media","Conversion optimisation"]'
  WHEN 'recruitment-consultancy' THEN '["First hires","Payroll setup","Employment processes","Recruitment campaigns"]'
  WHEN 'web-design-services' THEN '["Website launch","UX design","Accessibility","Conversion optimisation"]'
  WHEN 'marketing-advertising' THEN '["Brand strategy","Content","SEO","Paid media","Lead generation"]'
  WHEN 'it-software' THEN '["Cloud setup","Cyber security","Software delivery","Support"]'
  WHEN 'construction-services' THEN '["Commercial contracts","Health and safety","Project finance","Supplier setup"]'
  WHEN 'ecommerce-services' THEN '["Store launch","Product feeds","Paid media","Conversion optimisation"]'
  ELSE '[]'
END;

UPDATE agency_template_library
SET body_html = CASE segment_slug
      WHEN 'digital-agencies' THEN '<p>Hello {{company_name}},</p><p>Congratulations on launching your new business. The first few months are a great time to make sure your brand, website and acquisition plan are ready for the customers you want to win.</p><p>Our team helps new companies with:</p><ul><li>{{service_focus}}</li></ul><p>We combine practical delivery with clear commercial goals, so you can launch confidently without coordinating several suppliers yourself.</p><p>We would be happy to review what you are building and share three useful next steps for {{company_name}}.</p>'
      WHEN 'accounting-bookkeeping' THEN '<p>Hello {{company_name}},</p><p>Congratulations on your new company. Setting up the right financial routines early can make the difference between feeling in control and spending every month chasing paperwork.</p><p>We support founders with:</p><ul><li>{{service_focus}}</li></ul><p>Our approach is straightforward: clear advice, reliable deadlines and numbers you can use when making decisions about hiring, pricing and growth.</p><p>We can arrange a short introduction and explain what should be in place before your first year-end.</p>'
      WHEN 'legal-services' THEN '<p>Hello {{company_name}},</p><p>Starting a company brings important decisions about contracts, ownership, employment and compliance. Getting those foundations right now can prevent expensive problems later.</p><p>Our legal team can help with:</p><ul><li>{{service_focus}}</li></ul><p>We explain practical options in plain English and focus on documents that protect your business while helping you move quickly.</p><p>Reply to this letter if you would like an initial conversation about what matters most to {{company_name}}.</p>'
      WHEN 'property-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on establishing your new property business. Early decisions around acquisition, tenants, operations and reporting often shape how smoothly a portfolio grows.</p><p>We help property businesses with:</p><ul><li>{{service_focus}}</li></ul><p>Whether you are buying your first property, supporting landlords or preparing a commercial opportunity, our team gives you practical support from the start.</p><p>We would be glad to learn what you are planning and suggest a focused next step.</p>'
      WHEN 'recruitment-consultancy' THEN '<p>Hello {{company_name}},</p><p>New companies often reach their first growth milestone quickly. The right hiring process and people plan can help you grow without creating unnecessary cost or risk.</p><p>We support founders with:</p><ul><li>{{service_focus}}</li></ul><p>From defining the first role to building a repeatable process, we provide hands-on guidance tailored to your stage of business.</p><p>If hiring is on your roadmap, we would be happy to share a short plan for {{company_name}}.</p>'
      ELSE '<p>Hello {{company_name}},</p><p>Congratulations on your new company. The early stage is a useful time to put the right foundations in place before opportunities start moving quickly.</p><p>We can support you with:</p><ul><li>{{service_focus}}</li></ul><p>Our team provides practical, focused help based on your goals and the next stage of growth.</p><p>We would be happy to arrange a short introduction and share relevant ideas for {{company_name}}.</p>'
    END,
    merge_fields_json = '["company_name","company_number","incorporation_date","sic_codes","location","registered_office_address","agency_name","service_focus","opt_out_reference"]'
WHERE service_focus_json <> '[]';

UPDATE agency_letter_templates SET service_focus_json = COALESCE((SELECT service_focus_json FROM agency_template_library WHERE agency_template_library.id = agency_letter_templates.source_template_id), '[]') WHERE service_focus_json = '[]';
