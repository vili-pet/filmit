# Filmit

Maantieteellinen 7 sekunnin videopäiväkirja Androidille. Kun saavut tuttuun paikkaan, sovellus muistuttaa tallentamaan lyhyen hetken ja merkitsee sen henkilökohtaiselle elämän aikajanallesi — kartalla ja listana.

Mainokseton, kevyt ja täysin paikallinen. Tekijä: **Vili-Petteri** ([vili-pet](https://github.com/vili-pet)).

> Repo on nimeltään `snappit-daily` historiallisista syistä — sovellus julkaistiin alun perin Snappit-nimisenä selain-PWA:na ja vaihtui Filmitiksi, kun se paketoitiin aidoksi Android-sovellukseksi (Capacitor).

## Asennus

Lataa uusin allekirjoitettu APK [GitHub Releases](https://github.com/vili-pet/snappit-daily/releases)-sivulta ja avaa se puhelimessa (salli tuntemattomista lähteistä asennus).

Ensikäynnistyksessä:

1. Asetukset → **Place tracking** päälle → myönnä sijainti- ja ilmoitusluvat
2. Anna sijainnille **"Salli aina"** puhelimen asetuksista (sovelluksessa on suora painike "Open Android location settings") — muuten taustasaapumiset eivät näy
3. Säädä halutessasi tarkistusväli ja aktiiviset tunnit

## Ominaisuudet

- **7 sekunnin filmit** kamerasta (`getUserMedia` + `MediaRecorder`), esikatselu, uudelleenotto ja tallennus; tiedostotuonti varana
- **Taustaseuranta** (`@capacitor-community/background-geolocation`): pysyvä tilapalkki-ilmoitus, saapumismuistutus järjestelmäilmoituksena kun sovellus on taustalla
- **Akku mielessä**: GPS tarkistaa paikat valitulla välillä (15 / 30 / 60 / 90 min), **aktiiviset tunnit** rajataan kellonaikoina (ikkuna voi ylettää puunyli, esim. 22.00–06.00) ja ikkunan ulkopuolella paikannuspalvelu pysähtyy **kokonaan**. Lisäksi manuaalinen **Tauko**-kytkin
- **Karttanäkymä** (Leaflet + OpenStreetMap): paikat renkaina säteineen, filmit pinkeinä, popup siirtyy päivän näkymään
- **Elämän aikajana**: päivät ryhmiteltynä kuukausittain, filmit paikka- ja aikaleimoilla
- **Viikko- / kuukausi- / vuosikoosteet**: canvas + `MediaRecorder` -koodaus, peräkkäinen esikatselu varana
- **Natiivi jako/export**: yksittäinen filmi, koko päivän filmet tai valmis montaaši Androidin jakoikkunaan — videot eivät koskaan päädy galleriaan ilman erillistä jakoa
- Putki, XP ja saavutukset (mm. **1st Film**, **Streak Starter**), vaalea/tumma/järjestelmäteema, demodata-kytkin

## Privacy

- Filmit, paikat, koosteet ja pelillisyys tallennetaan **vain sovelluksen yksityiseen tallenteeseen** (IndexedDB) — **videot eivät näy puhelimen galleriassa**
- Palvelimelle ei lähetetä mediaa, koordinaatteja eikä analytiikkaa; kartta piirretään paikallisesti omasta datasta
- Tarkat koordinaatit ovat oletuksena piilossa: kartta piirtää filmit paikan keskipisteeseen, ellei "Show exact coordinates" ole päällä
- Jaetut tiedostot kirjoitetaan väliaikaisesti sovelluksen välimuistiin ja siivotaan seuraavan jaon yhteydessä
- Demodata on merkitty ja poistettavissa ilman omien filmien häviämistä

## Android-build

Vaatimukset: Node.js 22+, JDK 21, Android SDK (platform 35 + build-tools). Aseta `ANDROID_HOME` tai `android/local.properties` (`sdk.dir=...`).

```bash
npm install
npm test              # 33 yksikkötestiä
npm run android:sync  # vite build + cap sync
```

Sitten `android/`-kansiossa (JDK 21 pakollinen, esim. `JAVA_HOME`-ympäristömuuttujalla):

```bash
./gradlew assembleDebug     # debug-APK: android/app/build/outputs/apk/debug/
./gradlew assembleRelease   # allekirjoitettu APK (vaatii keystoren, alla)
```

Sovellustunnus on `pet.vili.snappit`, näkyvä nimi **Filmit**, näkymä lukittu pystyasentoon. Luvat kysytään ajonaikaisesti: kamera ja mikrofoni `getUserMedia`-kutsun yhteydessä, sijainti- ja ilmoitusluvat seurannan käynnistyessä.

### Julkaisubuild ja allekirjoitus

1. Luo keystore kerran ja säilytä se repon ulkopuolella:

   ```bash
   keytool -genkeypair -v -keystore ~/snappit-release.jks -keyalg RSA -keysize 2048 \
     -validity 10000 -alias snappit
   ```

2. Luo `android/keystore.properties` (gitignoroitu):

   ```properties
   storeFile=/absolute/path/to/snappit-release.jks
   storePassword=...
   keyAlias=snappit
   keyPassword=...
   ```

3. Aja `./gradlew assembleRelease`. Lopputulos: `android/app/build/outputs/apk/release/app-release.apk`.

**Sama avain joka buildiin** — eri avaimella signattu APK ei asennu vanhan päälle (ja poisto tyhjentää päiväkirjan). Julkaisutapa: GitHub Release (`gh release create vA.B.C filmit.apk`) — uusin release on jakelukanava, eikä sovellus tee itse päivitystarkistuksia.

## Testit

Yksikkötestit kattavat putken ja XP:n, päiväryhmityksen, geofence-siirtymät (hysteresis), koosteen jaksonvalinnan sekä seurannan aikataulu- ja intervalliportin:

```bash
npm test
```

## Arkkitehtuuri

Pieni client-only Vite + React + TypeScript -sovellus, paketoituna Capacitor 8 -kuoreen.

- `src/lib/` puhdas domain: päivämäärät, streak, geofence, montage
- `src/lib/schedule.ts` aktiivituntien ja intervallin portit (puhtaat funktiot, testattu)
- `src/lib/tracking.ts` TrackingController: natiivi watcher + web-fallback, ikkunapäätökset joka fixissä (Androidin jäädyttämät JS-timerit eivät voi jättää GPS:iä päälle)
- `src/lib/notify.ts` saapumisilmoitukset ja kanavan hallinta
- `src/lib/share.ts` levylle peräkkäin kirjoittava jako (ei base64-RAM-piikkejä, siivous seuraavassa jaossa)
- `src/lib/db.ts` IndexedDB
- `src/state/AppState.tsx` paikallinen tila ja seurannan kytkentä
- `src/views/` kuvaus, kartta, muistot, koosteet, asetukset

## Rajoitukset

- **Android vain** — taustaseuranta nojaa natiiviin foreground serviceen; iOS-portti vaatisi omat ilmoitukset ja sijaintitaustatilat
- Koosteiden yhteenliitos on **best-effort**: canvas + `MediaRecorder`. Jos koodaus epäonnistuu, näkymä näyttää peräkkäisen esikatselun eikä väitä onnistunutta encodea
- Android 10+ vaatii "Salli aina" -sijaintiluvan käsin järjestelmäasetuksista — sovellus ei voi pyytää sitä dialogilla
- Raskaan koostekoodauksen laajennuskohta: `src/lib/media.ts` → `composeMontage`
