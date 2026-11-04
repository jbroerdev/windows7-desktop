// Read-only System page. The host owns fetching, authorization and navigation.
const own = (object, key) => !!object && Object.prototype.hasOwnProperty.call(object, key);
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
const unknown = 'Nicht verfügbar';

/** Adapt only authorized task-manager data; never infer a Windows license or CPU model. */
export function systemDataFromTaskManager(snapshot, context = {}) {
  if (context.authenticated !== true || !['admin', 'user'].includes(context.role) || context.shareEditing === true || context.readonly === true) {
    return { status: 'restricted' };
  }
  if (!snapshot || !['host', 'runtime'].includes(snapshot.scope) || !snapshot.host) {
    return { status: 'unavailable' };
  }
  const host = snapshot.host;
  return {
    status: 'ready', scope: snapshot.scope,
    platform: text(host.platform), architecture: text(host.arch),
    computerName: text(host.hostname), logicalProcessors: Number.isInteger(host.cpus) ? positive(host.cpus) : null,
    memoryBytes: positive(host.totalMemory), generatedAt: text(snapshot.generatedAt)
  };
}

/**
 * data: adapter result; availableTargets: Set<string> or own-property boolean map.
 * onNavigate(target): host must recheck current profile/capability before navigation.
 * Returns a complete client area with sidebar. Hide the host's generic sidebar.
 */
export function renderControlPanelSystem({ data = {}, availableTargets = {}, onNavigate, document: doc = globalThis.document } = {}) {
  const el = (tag, value, cls) => {
    const node = doc.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (cls) node.className = cls;
    return node;
  };
  const root = el('section', undefined, 'cp-system-page');
  root.setAttribute('aria-label', 'System');
  const canNavigate = target => typeof onNavigate === 'function' &&
    (availableTargets instanceof Set ? availableTargets.has(target) : own(availableTargets, target) && availableTargets[target] === true);
  const link = (label, target) => {
    const button = el('button', label, 'cp-system-link');
    button.type = 'button'; button.dataset.systemTarget = target;
    button.disabled = !canNavigate(target);
    if (button.disabled) button.title = 'In dieser Webumgebung nicht verfügbar.';
    button.addEventListener('click', () => { if (canNavigate(target)) onNavigate(target); });
    return button;
  };
  const sidebar = el('nav', undefined, 'cp-system-sidebar');
  sidebar.setAttribute('aria-label', 'Systemaufgaben');
  sidebar.append(link('Startseite der Systemsteuerung', 'home'));
  const tasks = el('div', undefined, 'cp-system-tasks');
  for (const [label, target] of [
    ['Geräte-Manager', 'device-manager'], ['Remoteeinstellungen', 'remote-settings'],
    ['Computerschutz', 'system-protection'], ['Erweiterte Systemeinstellungen', 'advanced-system-settings']
  ]) tasks.append(link(label, target));
  const related = el('div', undefined, 'cp-system-related');
  related.append(el('p', 'Siehe auch'));
  for (const [label, target] of [['Wartungscenter', 'action-center'], ['Windows Update', 'windows-update'], ['Leistungsinformationen und -tools', 'performance']]) related.append(link(label, target));
  sidebar.append(tasks, related);
  const main = el('div', undefined, 'cp-system-main');
  main.append(el('h2', 'Basisinformationen über den Computer anzeigen'));
  const ready = data?.status === 'ready' && ['host', 'runtime'].includes(data.scope);
  const facts = ready ? data : {};
  const note = el('p', ready ? (data.scope === 'host' ? 'Angaben zum Server-Host.' : 'Angaben zur Server-Laufzeit; dies können Containerdaten sein.') : data?.status === 'restricted' ? 'Systemdaten sind in dieser Ansicht nicht freigegeben.' : 'Systemdaten sind derzeit nicht verfügbar.', 'cp-system-source');
  note.setAttribute('role', 'status');
  const section = (label, cls = '') => {
    const block = el('section', undefined, 'cp-system-section ' + cls);
    block.append(el('h3', label)); main.append(block); return block;
  };
  const edition = section('Windows-Edition', 'cp-system-edition');
  const editionText = el('div', undefined, 'cp-system-section-content');
  editionText.append(el('p', 'Windows-7-Webdesktop'), el('p', 'Weboberfläche im Stil von Windows 7.'));
  editionText.append(el('p', 'Betriebssystem: ' + (text(facts.platform) || unknown)), note);
  edition.append(editionText);
  const system = section('System');
  const rows = (parent, entries) => {
    const list = el('dl', undefined, 'cp-system-facts');
    for (const [label, value] of entries) list.append(el('dt', label), el('dd', value));
    parent.append(list);
  };
  const memory = positive(facts.memoryBytes);
  const memoryText = memory ? new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(memory / 1073741824) + ' GiB' : unknown;
  const processors = positive(facts.logicalProcessors);
  rows(system, [
    ['Klassifikation:', 'Keine Windows-Leistungsbewertung verfügbar'],
    ['Prozessor:', processors && Number.isInteger(processors) ? 'Modell nicht verfügbar · ' + processors + ' logische Prozessoren' : unknown],
    ['Arbeitsspeicher (RAM):', memoryText],
    ['Systemtyp:', text(facts.architecture) || unknown],
    ['Stift- und Fingereingabe:', 'Vom Server nicht erfasst']
  ]);
  const name = section('Einstellungen für Computernamen, Domäne und Arbeitsgruppe');
  const nameContent = el('div', undefined, 'cp-system-name-content');
  rows(nameContent, [['Computername:', text(facts.computerName) || unknown], ['Vollständiger Computername:', 'Nicht erfasst'], ['Computerbeschreibung:', 'Nicht erfasst'], ['Arbeitsgruppe:', 'Nicht erfasst']]);
  nameContent.append(link('Einstellungen ändern', 'computer-name')); name.append(nameContent);
  const activation = section('Windows-Aktivierung');
  const activationText = el('div', undefined, 'cp-system-section-content');
  activationText.append(el('p', 'Für diesen Webdesktop ist kein Windows-Aktivierungsstatus verfügbar.'));
  activation.append(activationText);
  root.append(sidebar, main);
  return root;
}
