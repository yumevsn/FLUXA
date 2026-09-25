import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmark, chevronDown, chevronForward, close } from 'ionicons/icons';
import {
  CATEGORIES,
  Category,
  fold,
  formatSpeakers,
  Language,
  LanguageData,
  loadLanguages,
  statusLabel,
  varietyValue,
} from '../utils/languages';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}

const ANY = 'Any';
const PAGE = 50;
const MAX_TAGS = 6;

/**
 * A field that opens a searchable catalogue of the world's languages —
 * living, ancient, extinct, constructed and sign languages — with their
 * dialects and varieties, grouped by region and tagged by country.
 */
const LanguagePicker = ({ label, value, onChange, helperText }: Props) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LanguageData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [varietyLimit, setVarietyLimit] = useState(20);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<Set<string>>(new Set());
  const searchbar = useRef<HTMLIonSearchbarElement>(null);
  const content = useRef<HTMLIonContentElement>(null);

  useEffect(() => {
    if (!open || data) return;
    loadLanguages()
      .then(setData)
      .catch(() => setLoadError(true));
  }, [open, data]);

  // Back to the top of the list whenever the filters change
  useEffect(() => {
    setLimit(PAGE);
    setVarietyLimit(20);
    content.current?.scrollToTop(0);
  }, [query, category, country]);

  const q = fold(query.trim());

  const languages = useMemo(() => {
    if (!data) return [];
    return data.languages.filter(
      (l) =>
        (!category || l.categories.has(category)) &&
        (!country || l.countries.includes(country)) &&
        (!q || l.search.includes(q))
    );
  }, [data, q, category, country]);

  const varieties = useMemo(() => {
    if (!data || q.length < 2) return [];
    return data.varieties.filter(
      (v) =>
        v.search.includes(q) &&
        (!category || v.language.categories.has(category)) &&
        (!country || v.language.countries.includes(country))
    );
  }, [data, q, category, country]);

  const matchingCountries = useMemo(() => {
    if (!data || q.length < 2 || country) return [];
    return data.countries.filter((c) => c.search.startsWith(q)).slice(0, 4);
  }, [data, q, country]);

  const trimmed = query.trim();
  const exactMatch =
    !!data &&
    !!trimmed &&
    (data.languages.some((l) => fold(l.name) === q) ||
      data.varieties.some((v) => fold(v.value) === q || v.search === q) ||
      data.countries.some((c) => c.search === q));
  const filtering = !!(q || category || country);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const reset = () => {
    setQuery('');
    setCategory(null);
    setCountry(null);
    setExpanded(new Set());
    setAllTags(new Set());
  };

  const filterCountry = (e: React.MouseEvent, code: string) => {
    e.stopPropagation(); // don't select the language row
    setCountry(code);
    setCategory(null);
    setQuery('');
  };

  const toggle = (set: Set<string>, key: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update(next);
  };

  const row = (lang: Language) => {
    const status = statusLabel(lang.status);
    const speakers = formatSpeakers(lang.pop);
    const subgroupCount = lang.members.length + lang.dialects.length;
    const isOpen = expanded.has(lang.code);
    const showAllTags = allTags.has(lang.code);
    const tags = showAllTags ? lang.countries : lang.countries.slice(0, MAX_TAGS);
    const meta = [
      lang.macro && `Part of ${lang.macro.name}`,
      lang.family && lang.family !== lang.name && lang.family,
      speakers,
    ].filter(Boolean);

    return (
      <div key={lang.code} className={`lang-item ${lang.name === value ? 'selected' : ''}`}>
        <button type="button" className="lang-main" onClick={() => choose(lang.name)}>
          <div className="lang-name">
            <span>{lang.name}</span>
            {lang.native && lang.native !== lang.name && (
              <span className="muted"> · {lang.native}</span>
            )}
            {status && <span className="status-badge">{status}</span>}
          </div>
          {meta.length > 0 && <div className="lang-meta">{meta.join(' · ')}</div>}
          {lang.name === value && <IonIcon className="lang-check" icon={checkmark} color="primary" />}
        </button>

        {lang.countries.length > 0 && data && (
          <div className="lang-tags">
            {tags.map((c) => (
              <button
                key={c}
                type="button"
                className={`tag tag-button ${c === country ? 'active' : ''}`}
                onClick={(e) => filterCountry(e, c)}
              >
                {data.countryName(c)}
              </button>
            ))}
            {lang.countries.length > MAX_TAGS && (
              <button
                type="button"
                className="tag tag-more"
                onClick={() => toggle(allTags, lang.code, setAllTags)}
              >
                {showAllTags ? 'Show less' : `+${lang.countries.length - MAX_TAGS} more`}
              </button>
            )}
          </div>
        )}

        {subgroupCount > 0 && (
          <button
            type="button"
            className="subgroup-toggle"
            onClick={() => toggle(expanded, lang.code, setExpanded)}
            aria-expanded={isOpen}
          >
            <IonIcon icon={isOpen ? chevronDown : chevronForward} />
            {lang.members.length > 0 && `${lang.members.length} languages`}
            {lang.members.length > 0 && lang.dialects.length > 0 && ' · '}
            {lang.dialects.length > 0 &&
              `${lang.dialects.length} ${lang.dialects.length === 1 ? 'dialect' : 'dialects & varieties'}`}
          </button>
        )}

        {isOpen && (
          <div className="subgroups">
            {lang.members.length > 0 && (
              <>
                <div className="subgroup-heading">Languages in this group</div>
                <div className="subgroup-list">
                  {lang.members.map((m) => (
                    <button
                      key={m.code}
                      type="button"
                      className={`subgroup ${m.name === value ? 'active' : ''}`}
                      onClick={() => choose(m.name)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {lang.dialects.length > 0 && (
              <>
                <div className="subgroup-heading">Dialects & varieties</div>
                <div className="subgroup-list">
                  {lang.dialects.map((d) => {
                    const v = varietyValue(d, lang.name);
                    return (
                      <button
                        key={d}
                        type="button"
                        className={`subgroup ${v === value ? 'active' : ''}`}
                        onClick={() => choose(v)}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const heading = country
    ? `Spoken in ${data?.countryName(country) ?? country}`
    : category
      ? category
      : q
        ? 'Languages'
        : 'Most spoken';

  return (
    <>
      <IonItem button detail={false} onClick={() => setOpen(true)}>
        <IonLabel className="lang-field">
          <span className="lang-field-label">{label}</span>
          <span className={value ? '' : 'muted'}>{value || 'Choose a language'}</span>
          {helperText && <span className="item-sub">{helperText}</span>}
        </IonLabel>
        <IonIcon slot="end" icon={chevronDown} className="muted" />
      </IonItem>

      <IonModal
        isOpen={open}
        onWillPresent={reset}
        onDidPresent={() => searchbar.current?.setFocus()}
        onDidDismiss={() => setOpen(false)}
      >
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={() => setOpen(false)}>Cancel</IonButton>
            </IonButtons>
            <IonTitle>Language</IonTitle>
            {value && (
              <IonButtons slot="end">
                <IonButton onClick={() => choose('')}>Clear</IonButton>
              </IonButtons>
            )}
          </IonToolbar>
          <IonToolbar>
            <IonSearchbar
              ref={searchbar}
              placeholder="Search a language, dialect or country"
              value={query}
              debounce={150}
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
            />
          </IonToolbar>
          <IonToolbar className="chip-bar">
            <div className="chip-scroll">
              {country ? (
                <IonChip className="chip-active" onClick={() => setCountry(null)}>
                  <IonLabel>{data?.countryName(country) ?? country}</IonLabel>
                  <IonIcon icon={close} />
                </IonChip>
              ) : (
                <>
                  <IonChip
                    className={category === null ? 'chip-active' : ''}
                    onClick={() => setCategory(null)}
                  >
                    All
                  </IonChip>
                  {CATEGORIES.map((c) => (
                    <IonChip
                      key={c}
                      className={category === c ? 'chip-active' : ''}
                      onClick={() => setCategory(category === c ? null : c)}
                    >
                      {c}
                    </IonChip>
                  ))}
                </>
              )}
            </div>
          </IonToolbar>
        </IonHeader>

        <IonContent ref={content}>
          {!data && !loadError && (
            <div className="lang-loading">
              <IonSpinner name="crescent" />
            </div>
          )}
          {loadError && (
            <p className="ion-padding error-text">
              Couldn't load the language list. You can still type a language and tap “Use”.
            </p>
          )}

          <div className="lang-list">
            {!filtering && (
              <button type="button" className="lang-item lang-main plain" onClick={() => choose(ANY)}>
                <div className="lang-name">Any</div>
                <div className="lang-meta">Mixed or no specific language</div>
                {value === ANY && <IonIcon className="lang-check" icon={checkmark} color="primary" />}
              </button>
            )}

            {trimmed && !exactMatch && (
              <button type="button" className="lang-item lang-main plain" onClick={() => choose(trimmed)}>
                <div className="lang-name">Use “{trimmed}”</div>
                <div className="lang-meta">Not in the list? Use it exactly as typed.</div>
              </button>
            )}

            {matchingCountries.length > 0 && (
              <div className="country-suggestions">
                {matchingCountries.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="tag tag-button"
                    onClick={(e) => filterCountry(e, c.code)}
                  >
                    Languages of {c.name}
                  </button>
                ))}
              </div>
            )}

            {data && (languages.length > 0 || varieties.length === 0) && (
              <div className="list-heading">
                {heading} · {languages.length.toLocaleString()}{' '}
                {languages.length === 1 ? 'language' : 'languages'}
              </div>
            )}
            {languages.slice(0, limit).map(row)}
            {languages.length > limit && (
              <IonButton fill="clear" expand="block" onClick={() => setLimit((n) => n + PAGE)}>
                Show more ({(languages.length - limit).toLocaleString()} left)
              </IonButton>
            )}

            {varieties.length > 0 && (
              <>
                <div className="list-heading">
                  Dialects & varieties · {varieties.length.toLocaleString()}
                </div>
                {varieties.slice(0, varietyLimit).map((v) => (
                  <button
                    key={`${v.language.code}:${v.name}`}
                    type="button"
                    className={`lang-item lang-main plain ${v.value === value ? 'selected' : ''}`}
                    onClick={() => choose(v.value)}
                  >
                    <div className="lang-name">{v.name}</div>
                    <div className="lang-meta">Dialect of {v.language.name}</div>
                    {v.value === value && (
                      <IonIcon className="lang-check" icon={checkmark} color="primary" />
                    )}
                  </button>
                ))}
                {varieties.length > varietyLimit && (
                  <IonButton fill="clear" expand="block" onClick={() => setVarietyLimit((n) => n + 40)}>
                    Show more dialects ({(varieties.length - varietyLimit).toLocaleString()} left)
                  </IonButton>
                )}
              </>
            )}

            {data && languages.length === 0 && varieties.length === 0 && (
              <p className="muted ion-padding">No languages match.</p>
            )}
          </div>

          {data && (
            <p className="lang-credit">
              Language data: ISO 639-3 (SIL International), Glottolog (CC-BY 4.0), Unicode CLDR.
            </p>
          )}
        </IonContent>
      </IonModal>
    </>
  );
};

export default LanguagePicker;
