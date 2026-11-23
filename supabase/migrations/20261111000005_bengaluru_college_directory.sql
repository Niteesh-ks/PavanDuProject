INSERT INTO public.colleges (name, code, city, state, address, latitude, longitude, website)
VALUES
    ('SJB Institute of Technology', 'SJBIT', 'Bengaluru', 'Karnataka', 'BGS Road, Hemmigepura, Bengaluru 560060', 12.8990538, 77.4963065, 'https://www.sjbit.edu.in'),
    ('Bangalore Institute of Technology', 'BIT', 'Bengaluru', 'Karnataka', 'Krishna Rajendra Road, V.V. Puram, Bengaluru 560004', 12.9551259, 77.5741985, 'https://bit-bangalore.edu.in'),
    ('University Visvesvaraya College of Engineering', 'UVCE', 'Bengaluru', 'Karnataka', 'Nrupatunga Road, Bengaluru 560001', 12.9747450, 77.5859733, 'https://uvce.ac.in'),
    ('Nitte Meenakshi Institute of Technology', 'NMIT', 'Bengaluru', 'Karnataka', 'NITTE Meenakshi College Road, Yelahanka, Bengaluru 560063', 13.1288782, 77.5872496, 'https://nmit.ac.in'),
    ('CMR Institute of Technology', 'CMRIT', 'Bengaluru', 'Karnataka', 'AECS Layout, Brookefield, Bengaluru 560037', 12.9666543, 77.7116234, 'https://www.cmrit.ac.in'),
    ('New Horizon College of Engineering', 'NHCE', 'Bengaluru', 'Karnataka', 'Outer Ring Road, Bellandur, Bengaluru 560103', 12.9343108, 77.6925122, 'https://newhorizonindia.edu'),
    ('Acharya Institute of Technology', 'AIT', 'Bengaluru', 'Karnataka', 'Acharya Dr. Sarvepalli Radhakrishnan Road, Bengaluru 560107', 13.0857201, 77.4818588, 'https://www.acharya.ac.in'),
    ('BNM Institute of Technology', 'BNMIT', 'Bengaluru', 'Karnataka', 'Dharmagiri, Banashankari, Bengaluru', 12.9220573, 77.5669083, 'https://bnmit.org'),
    ('Dayananda Sagar Academy of Technology and Management', 'DSATM', 'Bengaluru', 'Karnataka', 'Kanakapura Road, Udayapura, Bengaluru 560083', 12.8250887, 77.5150910, 'https://dsatm.edu.in'),
    ('Jain University', 'JAIN', 'Bengaluru', 'Karnataka', 'Jain College Road, Jayanagar 9th Block, Bengaluru 560041', 12.9181825, 77.5918533, 'https://www.jainuniversity.ac.in'),
    ('Alliance University', 'ALLIANCE', 'Bengaluru', 'Karnataka', 'Alliance University Service Road, Anekal, Bengaluru 562106', 12.7297587, 77.7087603, 'https://www.alliance.edu.in'),
    ('Presidency University', 'PRESIDENCY', 'Bengaluru', 'Karnataka', 'Kakolu Road, Yelahanka, Bengaluru 560089', 13.1693192, 77.5347979, 'https://presidencyuniversity.in'),
    ('RNS Institute of Technology', 'RNSIT', 'Bengaluru', 'Karnataka', 'Channasandra, Bengaluru 560098', 12.9006694, 77.5178581, 'https://www.rnsit.ac.in')
ON CONFLICT DO NOTHING;
