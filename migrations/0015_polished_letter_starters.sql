-- Refresh platform-owned starters only. Workspace drafts and campaign snapshots are preserved.
UPDATE agency_template_library
SET
  subject = CASE segment_slug
    WHEN 'digital-agencies' THEN 'A stronger first impression for {{company_name}}'
    WHEN 'web-design-services' THEN 'A website that gives {{company_name}} a confident start'
    WHEN 'marketing-advertising' THEN 'A practical launch plan for {{company_name}}'
    WHEN 'it-software' THEN 'Reliable technology foundations for {{company_name}}'
    WHEN 'accounting-bookkeeping' THEN 'Start {{company_name}} with the right financial foundations'
    WHEN 'property-services' THEN 'Practical support for the next step at {{company_name}}'
    WHEN 'construction-services' THEN 'Helping {{company_name}} build on solid foundations'
    WHEN 'ecommerce-services' THEN 'Turn the launch of {{company_name}} into early momentum'
    WHEN 'legal-services' THEN 'Protect the foundations of {{company_name}}'
    WHEN 'recruitment-consultancy' THEN 'A people plan for the next stage of {{company_name}}'
    ELSE 'A practical way to support {{company_name}}' END,
  body_html = CASE segment_slug
    WHEN 'digital-agencies' THEN '<p>Hello {{company_name}},</p><p>Congratulations on launching your new company. The first few months are the ideal time to create a brand and digital presence that earns trust from the customers you want to reach.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our team combines clear strategy with hands-on delivery, giving you one dependable partner from first idea to launch.</p><p>We would be happy to share three practical ideas tailored to {{company_name}}.</p>'
    WHEN 'web-design-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on your new business. A clear, credible website can make it easier for customers to understand what you do and feel confident getting in touch.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>We design accessible, fast websites around real business goals rather than unnecessary complexity.</p><p>We would be glad to review your plans and suggest a focused first step for {{company_name}}.</p>'
    WHEN 'marketing-advertising' THEN '<p>Hello {{company_name}},</p><p>Congratulations on getting your company started. Early marketing works best when the message, audience and channels are aligned before time and budget are committed.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our approach is practical and measurable, helping new businesses build awareness and turn attention into genuine enquiries.</p><p>We would be happy to outline a simple 90-day launch plan for {{company_name}}.</p>'
    WHEN 'it-software' THEN '<p>Hello {{company_name}},</p><p>Congratulations on forming your new company. Reliable systems, security and support are easier to establish now than to repair after the business begins to scale.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>We provide straightforward technical guidance and dependable delivery without burdening your team with unnecessary complexity.</p><p>We would be glad to discuss the technology priorities for {{company_name}}.</p>'
    WHEN 'accounting-bookkeeping' THEN '<p>Hello {{company_name}},</p><p>Congratulations on your new company. Putting clear financial routines in place early helps you stay compliant, understand cash flow and make better decisions as the business grows.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>You will receive plain-English advice, reliable deadlines and useful numbers rather than paperwork without context.</p><p>We would be happy to explain what {{company_name}} should have in place before its first filing deadlines.</p>'
    WHEN 'property-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on establishing your new property business. Early decisions around transactions, tenants, operations and reporting can shape how smoothly the next opportunity progresses.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our team offers responsive, commercially focused support tailored to property businesses at the beginning of their journey.</p><p>We would be glad to learn about your plans and suggest a useful next step for {{company_name}}.</p>'
    WHEN 'construction-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on launching your new company. Strong commercial, safety and operational foundations help construction businesses take on work with confidence from the outset.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our support is practical, responsive and designed around the realities of running projects, managing suppliers and protecting margins.</p><p>We would be happy to discuss the next project or priority for {{company_name}}.</p>'
    WHEN 'ecommerce-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on your new ecommerce business. The right store, acquisition and fulfilment setup can turn an exciting launch into sustainable early growth.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>We connect the customer experience with commercial performance, helping you avoid fragmented tools and wasted launch spend.</p><p>We would be glad to share a focused growth checklist for {{company_name}}.</p>'
    WHEN 'legal-services' THEN '<p>Hello {{company_name}},</p><p>Congratulations on starting your company. Clear agreements and sensible compliance at the beginning can prevent expensive disputes and uncertainty later.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>We explain the options in plain English and focus on proportionate legal protection that supports the way you want to grow.</p><p>We would be happy to identify the immediate legal priorities for {{company_name}}.</p>'
    WHEN 'recruitment-consultancy' THEN '<p>Hello {{company_name}},</p><p>Congratulations on your new company. Your first hires and people processes can have an outsized effect on culture, cost and the pace of growth.</p><p>We can help with:</p><ul><li>{{service_focus}}</li></ul><p>From defining a role to creating a repeatable hiring process, we provide practical support suited to an early-stage business.</p><p>If hiring is on the roadmap, we would be happy to share a simple people plan for {{company_name}}.</p>'
    ELSE body_html END,
  service_focus_json = CASE segment_slug
    WHEN 'digital-agencies' THEN '["Brand strategy","Website design","SEO","Paid media","Conversion optimisation"]'
    WHEN 'web-design-services' THEN '["Website strategy","UX design","Accessible development","Content support","Conversion optimisation"]'
    WHEN 'marketing-advertising' THEN '["Launch strategy","Brand messaging","Content campaigns","Paid advertising","Measurement"]'
    WHEN 'it-software' THEN '["Cloud setup","Cyber security","Software delivery","Device management","Technical support"]'
    WHEN 'accounting-bookkeeping' THEN '["Bookkeeping","Payroll","VAT returns","Year-end accounts","Tax planning"]'
    WHEN 'property-services' THEN '["Conveyancing","Property management","Landlord support","Valuation","Commercial advice"]'
    WHEN 'construction-services' THEN '["Commercial contracts","Health and safety","Insurance support","Project systems","Supplier services"]'
    WHEN 'ecommerce-services' THEN '["Store design","Product feeds","Paid acquisition","Email automation","Fulfilment support"]'
    WHEN 'legal-services' THEN '["Commercial contracts","Employment agreements","IP protection","Data protection","Compliance"]'
    WHEN 'recruitment-consultancy' THEN '["First hires","Role design","Recruitment campaigns","Employment processes","People planning"]'
    ELSE service_focus_json END,
  cta_text = 'Book a short introduction',
  signature = 'Your team',
  version = '2',
  updated_at = datetime('now');

UPDATE agency_template_library
SET layout_json = json_object(
  'version', 1,
  'design', json_object('preset', CASE
    WHEN segment_slug IN ('digital-agencies','web-design-services','it-software','ecommerce-services') THEN 'modern'
    WHEN segment_slug IN ('marketing-advertising','legal-services','recruitment-consultancy') THEN 'editorial'
    ELSE 'minimal' END),
  'blocks', json_array(
    json_object('id','brand','type','brand','align','left'),
    json_object('id','recipient','type','recipient','align','left'),
    json_object('id','heading','type','heading','content',subject,'align','left'),
    json_object('id','opening','type','paragraph','content',CASE segment_slug
      WHEN 'accounting-bookkeeping' THEN 'Congratulations on your new company. Putting clear financial routines in place early helps you stay compliant, understand cash flow and make better decisions as the business grows.'
      WHEN 'legal-services' THEN 'Congratulations on starting your company. Clear agreements and sensible compliance at the beginning can prevent expensive disputes and uncertainty later.'
      WHEN 'construction-services' THEN 'Congratulations on launching your new company. Strong commercial, safety and operational foundations help construction businesses take on work with confidence.'
      WHEN 'ecommerce-services' THEN 'Congratulations on your new ecommerce business. The right store, acquisition and fulfilment setup can turn a launch into sustainable early growth.'
      ELSE 'Congratulations on launching your new company. The early stage is the ideal time to put the right foundations in place and build confidence with future customers.' END,'align','left'),
    json_object('id','services-title','type','paragraph','content','We can help with:','align','left'),
    json_object('id','services','type','list','content','{{service_focus}}','items',json_array('{{service_focus}}'),'align','left'),
    json_object('id','value','type','paragraph','content',CASE segment_slug
      WHEN 'accounting-bookkeeping' THEN 'You will receive plain-English advice, reliable deadlines and useful numbers rather than paperwork without context.'
      WHEN 'legal-services' THEN 'We explain the options in plain English and focus on proportionate protection that supports the way you want to grow.'
      WHEN 'property-services' THEN 'Our team offers responsive, commercially focused support tailored to property businesses at the beginning of their journey.'
      ELSE 'Our approach combines clear advice with practical delivery, giving you dependable support without unnecessary complexity.' END,'align','left'),
    json_object('id','offer','type','paragraph','content','We would be happy to share a few relevant ideas for {{company_name}} in a friendly 15-minute conversation.','align','left'),
    json_object('id','cta','type','cta','content','Book a short introduction','url',COALESCE(cta_url,''),'align','left'),
    json_object('id','qr','type','qr','content','Scan to choose a time','url',COALESCE(cta_url,''),'size','small','align','right'),
    json_object('id','signature','type','signature','content','Your team','align','left'),
    json_object('id','footer','type','footer','align','left')
  )
);
