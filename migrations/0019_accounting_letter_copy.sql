-- Give the accounting starter a warmer, more useful direct-mail narrative.
-- Workspace drafts are refreshed only when they still contain the untouched v2 copy.

UPDATE agency_template_library
SET
  subject = 'A strong financial start for {{company_name}}',
  body_html = '<p>First of all, congratulations on starting {{company_name}}. It is an exciting step, and we know there can be a lot to organise at once.</p><p>We help newly formed businesses put simple, reliable financial systems in place from day one. We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our advice is clear and practical, so you always know what is due, what the numbers mean and what to do next.</p><p>If it would be useful, we would be happy to have a friendly 15-minute conversation and share a simple checklist for {{company_name}}. No hard sell — just useful next steps before your first deadlines.</p>',
  signature = 'Best wishes — {{agency_name}}',
  version = '3',
  layout_json = json_object(
    'version', 1,
    'design', json_object('preset', 'minimal'),
    'blocks', json_array(
      json_object('id','brand','type','brand','align','left'),
      json_object('id','recipient','type','recipient','align','left'),
      json_object('id','heading','type','heading','content','A strong financial start for {{company_name}}','align','left'),
      json_object('id','opening','type','paragraph','content','First of all, congratulations on starting {{company_name}}. It is an exciting step, and we know there can be a lot to organise at once.','align','left'),
      json_object('id','intro','type','paragraph','content','We help newly formed businesses put simple, reliable financial systems in place from day one. We can help with:','align','left'),
      json_object('id','services','type','list','content','{{service_focus}}','items',json_array('{{service_focus}}'),'align','left'),
      json_object('id','value','type','paragraph','content','Our advice is clear and practical, so you always know what is due, what the numbers mean and what to do next.','align','left'),
      json_object('id','offer','type','paragraph','content','If it would be useful, we would be happy to have a friendly 15-minute conversation and share a simple checklist for {{company_name}}. No hard sell — just useful next steps before your first deadlines.','align','left'),
      json_object('id','cta','type','cta','content','Book a friendly 15-minute chat','url',COALESCE(cta_url,''),'align','left'),
      json_object('id','qr','type','qr','content','Scan to choose a time','url',COALESCE(cta_url,''),'size','small','align','right'),
      json_object('id','signature','type','signature','content','Best wishes — {{agency_name}}','align','left'),
      json_object('id','footer','type','footer','align','left')
    )
  ),
  cta_text = 'Book a friendly 15-minute chat',
  updated_at = datetime('now')
WHERE segment_slug = 'accounting-bookkeeping';

UPDATE agency_letter_templates
SET
  subject = 'A strong financial start for {{company_name}}',
  body_html = '<p>First of all, congratulations on starting {{company_name}}. It is an exciting step, and we know there can be a lot to organise at once.</p><p>We help newly formed businesses put simple, reliable financial systems in place from day one. We can help with:</p><ul><li>{{service_focus}}</li></ul><p>Our advice is clear and practical, so you always know what is due, what the numbers mean and what to do next.</p><p>If it would be useful, we would be happy to have a friendly 15-minute conversation and share a simple checklist for {{company_name}}. No hard sell — just useful next steps before your first deadlines.</p>',
  cta_text = 'Book a friendly 15-minute chat',
  signature = 'Best wishes — {{agency_name}}',
  template_version = '3',
  layout_json = (
    SELECT layout_json FROM agency_template_library
    WHERE segment_slug = 'accounting-bookkeeping'
    LIMIT 1
  ),
  updated_at = datetime('now')
WHERE source_template_id = (
    SELECT id FROM agency_template_library
    WHERE segment_slug = 'accounting-bookkeeping'
    LIMIT 1
  )
  AND COALESCE(is_campaign_snapshot, 0) = 0
  AND subject = 'Start {{company_name}} with the right financial foundations'
  AND layout_json LIKE '%Putting clear financial routines in place early%';
