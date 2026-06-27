const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.FOSSNOTE_DATABASE_PATH || path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function ensureColumn(table, column, definition) {
    const columns = await all(`PRAGMA table_info(${table})`);
    if (!columns.some((row) => row.name === column)) {
        await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

function close() {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function setTime(date, hours, minutes) {
    const next = new Date(date);
    next.setHours(hours, minutes, 0, 0);
    return next;
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatDate(date) {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatDateTime(date) {
    return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function nextWeekday(date, weekday) {
    const next = new Date(date);
    const diff = (weekday - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + diff);
    return next;
}

function mondayOfWeek(date) {
    const monday = new Date(date);
    const diff = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function addWeeks(date, weeks) {
    return addDays(date, weeks * 7);
}

async function ensureSchema() {
    await run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT,
        prenom TEXT,
        usertype INTEGER,
        classe TEXT,
        groupes TEXT,
        username TEXT UNIQUE,
        password TEXT,
        notes TEXT,
        adresse1 TEXT,
        adresse2 TEXT,
        adresse3 TEXT,
        adresse4 TEXT,
        codePostal TEXT,
        eMail TEXT,
        indicatifTel TEXT,
        numeroINE TEXT,
        pays TEXT,
        province TEXT,
        telephonePortable TEXT,
        ville TEXT,
        discordId TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT,
        prenom TEXT,
        genre TEXT,
        usertype INTEGER,
        username TEXT UNIQUE,
        password TEXT,
        adresse1 TEXT,
        adresse2 TEXT,
        adresse3 TEXT,
        adresse4 TEXT,
        codePostal TEXT,
        eMail TEXT,
        indicatifTel TEXT,
        numeroINE TEXT,
        pays TEXT,
        province TEXT,
        telephonePortable TEXT,
        ville TEXT,
        postIt TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        headTeacher TEXT,
        teachers TEXT,
        classRepresentatives TEXT,
        teacherSubjects TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS homeworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT,
        title TEXT,
        description TEXT,
        teachers TEXT,
        classes TEXT,
        groupes TEXT,
        students TEXT,
        date TEXT,
        endDate TEXT,
        hexColor TEXT,
        locked INTEGER
    )`);

    await run(`CREATE TABLE IF NOT EXISTS agenda_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scopeType TEXT NOT NULL,
        scopeValue TEXT NOT NULL,
        title TEXT NOT NULL,
        comment TEXT NOT NULL,
        dateStart TEXT NOT NULL,
        dateEnd TEXT NOT NULL,
        color TEXT NOT NULL,
        sansHoraire INTEGER NOT NULL DEFAULT 0
    )`);

    await run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        className TEXT NOT NULL,
        teacherUsername TEXT NOT NULL,
        subject TEXT NOT NULL,
        teacherLabel TEXT NOT NULL,
        room TEXT NOT NULL,
        date TEXT NOT NULL,
        place INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        color TEXT NOT NULL,
        cancelled INTEGER NOT NULL DEFAULT 0,
        isTest INTEGER NOT NULL DEFAULT 0
    )`);

    await ensureColumn('courses', 'isTest', 'INTEGER NOT NULL DEFAULT 0');
}

async function seedReferenceData(today) {
    await run(`DELETE FROM teachers`);
    await run(`DELETE FROM classes`);
    await run(`DELETE FROM subjects`);

    const notes = [
        { id: 1, subject: 'MATHEMATIQUES', grade: '16', outof: '20', date: formatDate(addDays(today, -16)), commentary: 'Calcul litteral', coef: '1' },
        { id: 2, subject: 'FRANCAIS', grade: '14', outof: '20', date: formatDate(addDays(today, -13)), commentary: 'Dictee et grammaire', coef: '1' },
        { id: 3, subject: 'SVT', grade: '17', outof: '20', date: formatDate(addDays(today, -10)), commentary: 'Respiration cellulaire', coef: '1' },
        { id: 4, subject: 'HIST.GEO', grade: '13', outof: '20', date: formatDate(addDays(today, -7)), commentary: 'Reperes chronologiques', coef: '1' },
        { id: 5, subject: 'ANGLAIS LV1', grade: '15', outof: '20', date: formatDate(addDays(today, -4)), commentary: 'Comprehension orale', coef: '1' }
    ];

    await run(
        `INSERT INTO students (nom, prenom, usertype, classe, groupes, username, password, notes, adresse1, adresse2, adresse3, adresse4, codePostal, eMail, indicatifTel, numeroINE, pays, province, telephonePortable, ville, discordId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET
            nom = excluded.nom,
            prenom = excluded.prenom,
            usertype = excluded.usertype,
            classe = excluded.classe,
            groupes = excluded.groupes,
            password = excluded.password,
            notes = excluded.notes,
            eMail = excluded.eMail,
            indicatifTel = excluded.indicatifTel,
            numeroINE = excluded.numeroINE,
            pays = excluded.pays,
            province = excluded.province,
            telephonePortable = excluded.telephonePortable,
            ville = excluded.ville,
            discordId = excluded.discordId`,
        [
            'KATY',
            'Alex',
            3,
            '5A',
            'A,5AP.1,5A-LAT,Semestre 1',
            'akaty',
            'Password123!',
            JSON.stringify(notes),
            '',
            '',
            '',
            '',
            '69000',
            'akaty@fossnote.test',
            '33',
            '123456789AB',
            'France',
            'Rhone-Alpes',
            '0712345678',
            'Lyon',
            '0'
        ]
    );

    const teachers = [
        ['PASTEUR', 'Louise', 'F', 1, 'lpasteur', 'lpasteur@fossnote.test', '0600000001', 'Lyon', 'Professeur principal 5A.'],
        ['TOCQUEVILLE', 'Alexis', 'M', 1, 'atocqueville', 'atocqueville@fossnote.test', '0600000002', 'Lyon', ''],
        ['LE CLEZIO', 'Jean', 'M', 1, 'jleclezio', 'jleclezio@fossnote.test', '0600000003', 'Lyon', ''],
        ['PYTHAGORE', 'Nicolas', 'M', 1, 'npythagore', 'npythagore@fossnote.test', '0600000004', 'Lyon', ''],
        ['EINSTEIN', 'Albert', 'M', 1, 'aeinstein', 'aeinstein@fossnote.test', '0600000005', 'Lyon', ''],
        ['JOBS', 'Steve', 'M', 1, 'sjobs', 'sjobs@fossnote.test', '0600000006', 'Lyon', ''],
        ['GARCIA LORCA', 'Federico', 'M', 1, 'fgarcialorca', 'fgarcialorca@fossnote.test', '0600000007', 'Lyon', ''],
        ['GOETHE', 'Johann', 'M', 1, 'jgoethe', 'jgoethe@fossnote.test', '0600000008', 'Lyon', ''],
        ['SHAKESPEARE', 'William', 'M', 1, 'wshakespeare', 'wshakespeare@fossnote.test', '0600000009', 'Lyon', ''],
        ['COUBERTIN', 'Pierre', 'M', 1, 'pcoubertin', 'pcoubertin@fossnote.test', '0600000010', 'Lyon', ''],
        ['CICERON', 'Marcus', 'M', 1, 'mciceron', 'mciceron@fossnote.test', '0600000011', 'Lyon', ''],
        ['PICASSO', 'Pablo', 'M', 1, 'ppicasso', 'ppicasso@fossnote.test', '0600000012', 'Lyon', ''],
        ['TCHAIKOVSKI', 'Piotr', 'M', 1, 'ptchaikovski', 'ptchaikovski@fossnote.test', '0600000013', 'Lyon', '']
    ];

    for (const teacher of teachers) {
        await run(
            `INSERT INTO teachers (nom, prenom, genre, usertype, username, password, adresse1, adresse2, adresse3, adresse4, codePostal, eMail, indicatifTel, numeroINE, pays, province, telephonePortable, ville, postIt)
             VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', '', ?, '33', '', 'France', 'Rhone-Alpes', ?, ?, ?)
             ON CONFLICT(username) DO UPDATE SET
                nom = excluded.nom,
                prenom = excluded.prenom,
                genre = excluded.genre,
                usertype = excluded.usertype,
                password = excluded.password,
                eMail = excluded.eMail,
                telephonePortable = excluded.telephonePortable,
                ville = excluded.ville,
                postIt = excluded.postIt`,
            [teacher[0], teacher[1], teacher[2], teacher[3], teacher[4], 'Password123!', teacher[5], teacher[6], teacher[7], teacher[8]]
        );
    }

    await run(
        `INSERT INTO classes (name, headTeacher, teachers, classRepresentatives, teacherSubjects)
         VALUES (?, ?, ?, ?, ?)`,
        [
            '5A',
            'lpasteur',
            'lpasteur,atocqueville,jleclezio,npythagore,aeinstein,sjobs,fgarcialorca,wshakespeare,pcoubertin,mciceron,ppicasso',
            'akaty',
            'lpasteur(SVT);atocqueville(HIST.GEO);jleclezio(FRANCAIS);npythagore(MATHEMATIQUES,ACC. PERSO);aeinstein(SC. PHYS);sjobs(TECHNO);fgarcialorca(ESPAGNOL LV2);wshakespeare(ANGLAIS LV1);pcoubertin(EPS);mciceron(EPI Rome antique);ppicasso(ARTS PLASTIQUES)'
        ]
    );

    for (const subject of [
        'SVT',
        'HIST.GEO',
        'FRANCAIS',
        'MATHEMATIQUES',
        'SC. PHYS',
        'EPI Rome antique',
        'LATIN',
        'TECHNO',
        'ESPAGNOL LV2',
        'ALLEMAND LV2',
        'ANGLAIS LV1',
        'EPS',
        'ACC. PERSO',
        'EPI Risques et secours',
        'ARTS PLASTIQUES',
        'ED MUSICALE'
    ]) {
        await run(`INSERT INTO subjects (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = ?)`, [subject, subject]);
    }
}

async function seedHomeworks(today) {
    const homeworks = [
        ['MATHEMATIQUES', 'Exercices de fractions', 'Exercices 24 a 31 page 87. Rediger les calculs et simplifier les resultats.', 'Pythagore', '5A', '', 'akaty', today, addDays(today, 2), '#004B87', 0],
        ['FRANCAIS', 'Lecture analytique', 'Lire le texte distribue et repondre aux questions 1 a 6 sur le cahier.', 'Le Clezio J.', '5A', '', 'akaty', today, addDays(today, 3), '#C00000', 0],
        ['SC. PHYS', 'Exercices circuits electriques', 'Faire les exercices 3, 4 et 7 sur les dipoles et revoir le vocabulaire.', 'Einstein A.', '5A', '', 'akaty', today, addDays(today, 4), '#0C88B8', 0],
        ['HIST.GEO', 'Controle de reperes', 'Controle: apprendre la fiche sur les reperes historiques et savoir refaire la frise.', 'Tocqueville A.', '5A', '', 'akaty', today, addDays(today, 5), '#7A3A3A', 0],
        ['ANGLAIS LV1', 'Vocabulaire unit 4', 'Apprendre la liste de vocabulaire et preparer cinq phrases au futur.', 'Shakespeare W.', '5A', '', 'akaty', today, addDays(today, 6), '#FF00DC', 0],
        ['SVT', 'Schema a completer', 'Completer le schema de la respiration et apprendre les definitions du chapitre.', 'Pasteur L.', '5A', '', 'akaty', today, addDays(today, 7), '#73F4EE', 0],
        ['TECHNO', 'Fiche projet', 'Terminer la fiche fonction d usage / fonction technique et ajouter deux exemples.', 'Jobs S.', '5A', '', 'akaty', today, addDays(today, 8), '#3498F4', 0],
        ['ESPAGNOL LV2', 'Ejercicios de vocabulario', 'Faire les exercices 2 et 3 et apprendre les verbes de la lecon.', 'Garcia Lorca F.', '5A', '5AP.1', 'akaty', today, addDays(today, 9), '#A235F0', 0],
        ['MATHEMATIQUES', 'Controle de proportionnalite', 'Controle: reviser les tableaux de proportionnalite, pourcentages et echelles.', 'Pythagore', '5A', '', 'akaty', today, addDays(today, 10), '#004B87', 0],
        ['FRANCAIS', 'Controle conjugaison', 'Controle: revoir present, imparfait et passe compose. Preparer les verbes irreguliers.', 'Le Clezio J.', '5A', '', 'akaty', today, addDays(today, 12), '#C00000', 0],
        ['ARTS PLASTIQUES', 'Materiel a apporter', 'Apporter feuilles A3, crayons de couleur et une image de reference.', 'Picasso P.', '5A', '', 'akaty', today, addDays(today, 13), '#F26A00', 0]
    ];

    await run(`DELETE FROM homeworks`);

    for (const homework of homeworks) {
        await run(
            `INSERT INTO homeworks (subject, title, description, teachers, classes, groupes, students, date, endDate, hexColor, locked)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                homework[0],
                homework[1],
                homework[2],
                homework[3],
                homework[4],
                homework[5],
                homework[6],
                formatDate(homework[7]),
                formatDate(homework[8]),
                homework[9],
                homework[10]
            ]
        );
    }
}

async function seedAgendaAndCourses(today) {
    const firstMonday = mondayOfWeek(today);

    await run(`DELETE FROM agenda_events`);
    await run(`DELETE FROM courses`);

    const events = [
        ['global', '*', 'Reunion parents-professeurs', 'Rendez-vous factice pour tester les agendas Kroco.', setTime(addWeeks(firstMonday, 1), 17, 30), setTime(addWeeks(firstMonday, 1), 19, 0), '#3498DB', 0],
        ['class', '5A', 'Conseil de classe 5A', 'Bilan du trimestre avec le professeur principal.', setTime(addDays(addWeeks(firstMonday, 1), 1), 16, 45), setTime(addDays(addWeeks(firstMonday, 1), 1), 18, 15), '#9B59B6', 0],
        ['class', '5A', 'Sortie CDI', 'Recherche documentaire encadree pour le travail de francais.', setTime(addDays(addWeeks(firstMonday, 2), 2), 10, 0), setTime(addDays(addWeeks(firstMonday, 2), 2), 11, 30), '#2ECC71', 0],
        ['teacher', 'lpasteur', 'Equipe pedagogique 5A', 'Preparation du prochain cycle de devoirs.', setTime(addDays(addWeeks(firstMonday, 2), 3), 12, 30), setTime(addDays(addWeeks(firstMonday, 2), 3), 13, 15), '#E67E22', 0],
        ['global', '*', 'Journee banalisee tests Kroco', 'Evenement sans horaire pour valider les imports.', addDays(addWeeks(firstMonday, 3), 4), addDays(addWeeks(firstMonday, 3), 4), '#95A5A6', 1]
    ];

    for (const event of events) {
        await run(
            `INSERT INTO agenda_events (scopeType, scopeValue, title, comment, dateStart, dateEnd, color, sansHoraire)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                event[0],
                event[1],
                event[2],
                event[3],
                event[7] ? formatDate(event[4]) : formatDateTime(event[4]),
                event[7] ? formatDate(event[5]) : formatDateTime(event[5]),
                event[6],
                event[7]
            ]
        );
    }

    const weeklyCourses = [
        [0, 0, 1, 'SVT', 'lpasteur', 'PASTEUR L.', 'Labo SVT', '#73F4EE'],
        [0, 1, 1, 'HIST.GEO', 'atocqueville', 'TOCQUEVILLE A.', 'Salle 205', '#7A3A3A'],
        [0, 2, 1, 'FRANCAIS', 'jleclezio', 'LE CLEZIO J.', 'Salle 101', '#C00000'],
        [0, 3, 1, 'MATHEMATIQUES', 'npythagore', 'PYTHAGORE', 'Salle 208', '#004B87'],
        [0, 5, 2, 'EPI Rome antique', 'mciceron', 'CICERON', 'Salle projet', '#BFBFBF'],

        [1, 0, 1, 'TECHNO', 'sjobs', 'JOBS S.', 'Labo techno', '#3498F4'],
        [1, 1, 1, 'HIST.GEO', 'atocqueville', 'TOCQUEVILLE A.', 'Salle 205', '#7A3A3A'],
        [1, 2, 1, 'SC. PHYS', 'aeinstein', 'EINSTEIN A.', 'Labo physique', '#0C88B8'],
        [1, 4, 1, 'ANGLAIS LV1', 'wshakespeare', 'SHAKESPEARE W.', 'Salle 201', '#FF00DC'],
        [1, 5, 1, 'ACC. PERSO', 'npythagore', 'PYTHAGORE', 'Salle permanence', '#3D8583'],
        [1, 6, 1, 'ACC. PERSO', 'jleclezio', 'LE CLEZIO J.', 'Salle permanence', '#3D8583'],

        [2, 0, 1, 'FRANCAIS', 'jleclezio', 'LE CLEZIO J.', 'Salle 101', '#C00000'],
        [2, 1, 1, 'MATHEMATIQUES', 'npythagore', 'PYTHAGORE', 'Salle 208', '#004B87'],
        [2, 2, 2, 'EPS', 'pcoubertin', 'COUBERTIN P.', 'Gymnase', '#77F47B'],

        [3, 0, 1, 'FRANCAIS', 'jleclezio', 'LE CLEZIO J.', 'Salle 101', '#C00000'],
        [3, 1, 1, 'MATHEMATIQUES', 'npythagore', 'PYTHAGORE', 'Salle 208', '#004B87'],
        [3, 2, 1, 'ANGLAIS LV1', 'wshakespeare', 'SHAKESPEARE W.', 'Salle 201', '#FF00DC'],
        [3, 3, 1, 'HIST.GEO', 'atocqueville', 'TOCQUEVILLE A.', 'Salle 205', '#7A3A3A'],
        [3, 5, 1, 'ESPAGNOL LV2', 'fgarcialorca', 'GARCIA LORCA F. [5AP.1]', 'Salle 301', '#A235F0'],
        [3, 6, 1, 'ACC. PERSO', 'jleclezio', 'LE CLEZIO J.', 'Salle permanence', '#3D8583'],

        [4, 0, 1, 'ESPAGNOL LV2', 'fgarcialorca', 'GARCIA LORCA F. [5AP.1]', 'Salle 301', '#A235F0'],
        [4, 1, 2, 'ARTS PLASTIQUES', 'ppicasso', 'PICASSO P.', 'Atelier arts', '#F26A00'],
        [4, 4, 1, 'ANGLAIS LV1', 'wshakespeare', 'SHAKESPEARE W.', 'Salle 201', '#FF00DC'],
        [4, 5, 1, 'TECHNO', 'sjobs', 'JOBS S.', 'Labo techno', '#3498F4'],
        [4, 6, 1, 'ACC. PERSO', 'npythagore', 'PYTHAGORE', 'Salle permanence', '#3D8583']
    ];

    const testLessons = new Set([
        '1|3|MATHEMATIQUES',
        '2|0|HIST.GEO',
        '2|2|FRANCAIS',
        '3|4|ANGLAIS LV1'
    ]);

    for (let week = 0; week < 52; week++) {
        const monday = addWeeks(firstMonday, week);
        for (const course of weeklyCourses) {
            const [weekday, place, duration, subject, teacherUsername, teacherLabel, room, color] = course;
            const courseDate = addDays(monday, weekday);
            const isTest = testLessons.has(`${week}|${weekday}|${subject}`) ? 1 : 0;
            await run(
                `INSERT INTO courses (className, teacherUsername, subject, teacherLabel, room, date, place, duration, color, cancelled, isTest)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    '5A',
                    teacherUsername,
                    subject,
                    teacherLabel,
                    room,
                    formatDate(courseDate),
                    place,
                    duration,
                    color,
                    0,
                    isTest
                ]
            );
        }
    }
}

async function main() {
    const today = new Date();
    await ensureSchema();
    await run(`DELETE FROM sessions`).catch(() => {});
    await run(`DELETE FROM evaluations`).catch(() => {});
    await seedReferenceData(today);
    await seedHomeworks(today);
    await seedAgendaAndCourses(today);
    console.log('Pronote sandbox seeded for Kroco tests.');
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => close());
