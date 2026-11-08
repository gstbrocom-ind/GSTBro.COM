INSERT INTO page_seo (route_path, meta_title, meta_description, robots)
VALUES
  ('/services/gst-compliance', 'GST Compliance Services | GSTBro', 'Complete GST compliance management for businesses across India. Stay compliant, avoid penalties, and keep your GST records accurate with GSTBro experts.', 'index,follow'),
  ('/services/gst-refund', 'GST Refund Services | GSTBro', 'Fast and hassle-free GST refund assistance for exporters, businesses, and eligible taxpayers. GSTBro handles documentation, filing, and follow-up.', 'index,follow'),
  ('/services/gst-audit', 'GST Audit and Assessment Services | GSTBro', 'Professional GST audit and assessment support including notice handling, reconciliation, departmental representation, and litigation assistance.', 'index,follow'),
  ('/services/gst-advisory', 'GST Advisory Services | GSTBro', 'Expert GST advisory and planning to optimize tax liability, reduce compliance risk, improve efficiency, and support better business decisions.', 'index,follow')
ON CONFLICT (route_path) DO UPDATE SET
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  robots = EXCLUDED.robots;
