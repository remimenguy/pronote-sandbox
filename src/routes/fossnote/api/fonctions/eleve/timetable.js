const eleves = require('../../../../../databases/eleves');
const { getCoursesForClass } = require('../../../../../databases/agenda');
const { encryptAES } = require('../../../../../cipher');
const { getFirstSchoolYear, getLastMondayOfAugust } = require('../../../../../helpers');

function parseFrenchDate(value) {
    const [day, month, year] = value.slice(0, 10).split('/').map((part) => parseInt(part, 10));
    return new Date(year, month - 1, day);
}

function weekNumberForDate(value) {
    const firstMonday = parseFrenchDate(getLastMondayOfAugust(getFirstSchoolYear()));
    const date = parseFrenchDate(value);
    return 1 + Math.floor((date - firstMonday) / (7 * 24 * 60 * 60 * 1000));
}

async function bind(req, res, currentSession) {
    const { session_id } = req.params;
    const challengeInfos = JSON.parse(currentSession.challenge);
    const user = await eleves.getUser(challengeInfos.username.toLowerCase());
    const requestedWeek = req.body.donneesSec.donnees.NumeroSemaine || req.body.donneesSec.donnees.numeroSemaine;
    const courses = user ? (await getCoursesForClass(user.classe)).filter((course) => {
        return !requestedWeek || weekNumberForDate(course.DateDuCours.V) === requestedWeek;
    }) : [];

    const numeroOrdre = await encryptAES(
        (currentSession.numeroOrdre + 2).toString(),
        JSON.parse(currentSession.aes).key,
        JSON.parse(currentSession.aes).iv
    );

    res.json({
        nom: "PageEmploiDuTemps",
        session: parseInt(session_id),
        numeroOrdre: numeroOrdre,
        donneesSec: {
            nom: "PageEmploiDuTemps",
            donnees: {
                ListeCours: courses
            }
        }
    });
}

module.exports = {
    bind
};
