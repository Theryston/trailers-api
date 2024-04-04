export default function compareLang(langA, langB) {
    const locateA = new Intl.Locale(langA);
    const locateB = new Intl.Locale(langB);

    const isSameLanguage = locateA.language === locateB.language;

    console.log(locateA.language, locateB.language, isSameLanguage);

    return isSameLanguage;
}