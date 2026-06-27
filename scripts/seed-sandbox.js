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
        cancelled INTEGER NOT NULL DEFAULT 0
    )`);
}

async function seedReferenceData(today) {
    const notes = [
        { id: 1, subject: 'Maths', grade: '17', outof: '20', date: formatDate(addDays(today, -15)), commentary: 'Trigonometrie', coef: '1' },
        { id: 2, subject: 'Anglais', grade: '15', outof: '20', date: formatDate(addDays(today, -11)), commentary: 'Oral de presentation', coef: '1' },
        { id: 3, subject: 'Technologie', grade: '18', outof: '20', date: formatDate(addDays(today, -8)), commentary: 'Projet capteur', coef: '2' },
        { id: 4, subject: 'Histoire-Geo', grade: '13', outof: '20', date: formatDate(addDays(today, -5)), commentary: 'Etude de documents', coef: '1' },
        { id: 5, subject: 'SVT', grade: '16', outof: '20', date: formatDate(addDays(today, -2)), commentary: 'Controle chapitre 4', coef: '1' }
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
            '3A',
            'groupe1,groupe2',
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
        ['GOTHIER', 'Paula', 'F', 1, 'pgothier', 'pgothier@fossnote.test', '0676767676', 'Villeurbanne', 'Revoir les copies 3A avant le conseil de classe.'],
        ['GOUSSE', 'Leo', 'M', 1, 'lgousse', 'lgousse@fossnote.test', '0766666000', 'Sainte-Foy-les-Lyon', '']
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

    await run(`DELETE FROM classes WHERE name = ?`, ['3A']);
    await run(
        `INSERT INTO classes (name, headTeacher, teachers, classRepresentatives, teacherSubjects)
         VALUES (?, ?, ?, ?, ?)`,
        ['3A', 'pgothier', 'pgothier,lgousse', 'akaty', 'pgothier(Maths,Technologie,Histoire-Geo,SVT);lgousse(Anglais)']
    );

    for (const subject of ['Maths', 'Technologie', 'Anglais', 'Histoire-Geo', 'SVT']) {
        await run(`INSERT INTO subjects (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = ?)`, [subject, subject]);
    }
}

async function seedHomeworks(today) {
    const homeworks = [
        ['Maths', 'Devoir maison', 'Exercices 12 a 18 page 142\nRediger la methode pour chaque calcul.', 'Mme Gothier P.', '3A', '', '', addDays(today, -1), addDays(today, 2), '#F49737', 0],
        ['Anglais', 'Expression ecrite', 'Write a 120-word paragraph about your weekend plans.', 'M. Gousse L.', '3A', '', '', today, addDays(today, 3), '#5DADE2', 0],
        ['Technologie', 'Schema fonctionnel', 'Completer le schema du capteur de luminosite et preparer trois questions.', 'Mme Gothier P.', '3A', '', '', today, addDays(today, 4), '#58D68D', 0],
        ['Histoire-Geo', 'Carte a reviser', 'Apprendre les reperes de la carte et revoir la fiche methode.', 'Mme Gothier P.', '3A', '', '', addDays(today, -2), addDays(today, 5), '#AF7AC5', 1],
        ['SVT', 'Compte rendu TP', 'Finaliser le compte rendu du TP sur la respiration cellulaire.', 'Mme Gothier P.', '3A', '', '', today, addDays(today, 7), '#EC7063', 0]
    ];

    await run(`DELETE FROM homeworks WHERE classes = ?`, ['3A']);

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
    const monday = nextWeekday(today, 1);
    const tuesday = addDays(monday, 1);
    const wednesday = addDays(monday, 2);
    const thursday = addDays(monday, 3);
    const friday = addDays(monday, 4);

    await run(`DELETE FROM agenda_events`);
    await run(`DELETE FROM courses`);

    const events = [
        ['global', '*', 'Reunion parents-professeurs', 'Rendez-vous factice pour tester les agendas Kroco.', setTime(monday, 17, 30), setTime(monday, 19, 0), '#3498DB', 0],
        ['class', '3A', 'Conseil de classe 3A', 'Bilan du trimestre et points de vigilance.', setTime(tuesday, 16, 45), setTime(tuesday, 18, 15), '#9B59B6', 0],
        ['class', '3A', 'Sortie CDI', 'Recherche documentaire encadree.', setTime(wednesday, 10, 0), setTime(wednesday, 11, 30), '#2ECC71', 0],
        ['teacher', 'pgothier', 'Equipe pedagogique 3A', 'Preparation du prochain cycle de devoirs.', setTime(thursday, 12, 30), setTime(thursday, 13, 15), '#E67E22', 0],
        ['global', '*', 'Journee banalisée tests Kroco', 'Evenement sans horaire pour valider les imports.', friday, friday, '#95A5A6', 1]
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

    const courses = [
        ['3A', 'pgothier', 'Maths', 'GOTHIER Paula', 'Salle 204', monday, 96, 12, '#F49737', 0],
        ['3A', 'lgousse', 'Anglais', 'GOUSSE Leo', 'Salle 118', monday, 112, 12, '#5DADE2', 0],
        ['3A', 'pgothier', 'Technologie', 'GOTHIER Paula', 'Labo Tech 1', tuesday, 90, 18, '#58D68D', 0],
        ['3A', 'pgothier', 'Histoire-Geo', 'GOTHIER Paula', 'Salle 204', wednesday, 108, 12, '#AF7AC5', 1],
        ['3A', 'pgothier', 'SVT', 'GOTHIER Paula', 'Labo SVT', thursday, 96, 12, '#EC7063', 0],
        ['3A', 'lgousse', 'Anglais', 'GOUSSE Leo', 'Salle 118', friday, 102, 12, '#5DADE2', 0]
    ];

    for (const course of courses) {
        await run(
            `INSERT INTO courses (className, teacherUsername, subject, teacherLabel, room, date, place, duration, color, cancelled)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                course[0],
                course[1],
                course[2],
                course[3],
                course[4],
                formatDate(course[5]),
                course[6],
                course[7],
                course[8],
                course[9]
            ]
        );
    }
}

async function main() {
    const today = new Date();
    await ensureSchema();
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
