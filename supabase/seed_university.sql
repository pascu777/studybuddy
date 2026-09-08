-- StudyBuddy — catalogo università di esempio (F7). Eseguire dopo le migrazioni.

insert into public.universities (id, name, city) values
  ('unito', 'Università di Torino', 'Torino'),
  ('polito', 'Politecnico di Torino', 'Torino'),
  ('unipi', 'Università di Pisa', 'Pisa'),
  ('unimi', 'Università di Milano', 'Milano')
on conflict (id) do update set name = excluded.name, city = excluded.city;

insert into public.degree_courses (id, university_id, name, level) values
  ('dc-inf-polito', 'polito', 'Ingegneria Informatica', 'triennale'),
  ('dc-mecc-polito', 'polito', 'Ingegneria Meccanica', 'triennale'),
  ('dc-mat-unito', 'unito', 'Matematica', 'triennale'),
  ('dc-fis-unito', 'unito', 'Fisica', 'triennale'),
  ('dc-eco-unito', 'unito', 'Economia', 'triennale'),
  ('dc-inf-unipi', 'unipi', 'Informatica', 'triennale')
on conflict (id) do update set name = excluded.name, university_id = excluded.university_id, level = excluded.level;

insert into public.professors (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Prof. Elena Ferri'),
  ('22222222-2222-2222-2222-222222222222', 'Prof. Luca Marino'),
  ('33333333-3333-3333-3333-333333333333', 'Prof. Anna Villa'),
  ('44444444-4444-4444-4444-444444444444', 'Prof. Marco Testa')
on conflict (id) do update set name = excluded.name;

insert into public.courses (id, degree_course_id, name, year, professor_id, subject_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'dc-inf-polito', 'Analisi Matematica 1', 1, '11111111-1111-1111-1111-111111111111', 'analisi-matematica'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'dc-inf-polito', 'Fisica 1', 1, '22222222-2222-2222-2222-222222222222', 'fisica'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'dc-inf-polito', 'Programmazione', 1, '33333333-3333-3333-3333-333333333333', 'informatica'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'dc-inf-polito', 'Algoritmi e Strutture Dati', 2, '33333333-3333-3333-3333-333333333333', 'informatica'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'dc-mat-unito', 'Algebra 1', 1, '11111111-1111-1111-1111-111111111111', 'matematica'),
  ('aaaaaaaa-0000-0000-0000-000000000006', 'dc-fis-unito', 'Meccanica Quantistica', 3, '44444444-4444-4444-4444-444444444444', 'fisica'),
  ('aaaaaaaa-0000-0000-0000-000000000007', 'dc-eco-unito', 'Microeconomia', 1, '22222222-2222-2222-2222-222222222222', 'economia-politica')
on conflict (id) do update set name = excluded.name, degree_course_id = excluded.degree_course_id,
  year = excluded.year, professor_id = excluded.professor_id, subject_id = excluded.subject_id;
