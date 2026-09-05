import { CloudSave, BACKUP_KEY } from './cloud-save.js';
import { formatTime, sanitizeSave } from './progression.js';

const labels = { local: '本機存檔', ready: '雲端已同步', syncing: '同步中…', pending: '等待同步', conflict: '存檔需要選擇', deferred: '回選單同步', unavailable: '本機模式' };
const summary = save => `<strong>${save.souls} 殘魂</strong><span>${save.runs} 局 · 最佳 ${formatTime(save.best)} · 生還 ${save.wins} 次</span><small>永久強化 ${save.ranks.power} / ${save.ranks.vitality} / ${save.ranks.reach} · 印記 ${save.achievements.length} / 5</small>`;
const $ = id => document.getElementById(id);
export function connectCloud({ getSave, applySave, canApply, showDialog, closeDialog, isOpen }) {
  let notice = '', preview = null;
  const cloud = new CloudSave({ getSave, applySave, canApply, onStatus() {
    $('cloud-status').textContent = labels[cloud.status];
    $('open-cloud').dataset.status = cloud.status;
    if (isOpen()) render();
  } });
  function download(name, data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function render() {
    const focused = document.activeElement?.id;
    const typed = $('recovery-input')?.value || '';
    const busy = cloud.busy ? 'disabled' : '';
    showDialog('cloud', `<div class="sub">獵人的記憶 · ${labels[cloud.status]}</div><h2>雲端存檔</h2>
      <p>殘魂、永久強化、印記與最佳紀錄，隨你前往下一台裝置。<br>每局結算與強化後同步；進行中的戰局不會存入雲端。</p>
      <div class="save-summary">${summary(sanitizeSave(getSave()))}</div>
      <p id="cloud-message" role="status" class="cloud-message"></p>
      ${!cloud.available ? '<p>目前為本機模式。部署線上版後即可啟用雲端；現在可匯出進度，之後再帶到線上版。</p>' : cloud.conflict ?
        `<div class="cloud-conflict"><h3>兩台裝置的進度不同</h3><p>選擇保留的版本。替換前會備份這台裝置的紀錄。</p><div class="save-summary"><b>雲端紀錄</b>${summary(sanitizeSave(cloud.conflict.save))}</div><div class="dialog-actions"><button id="keep-local" ${busy}>用本機紀錄更新雲端</button><button id="keep-remote" ${busy}>取回雲端紀錄</button></div></div>` :
        cloud.state.code ? `<div class="dialog-actions"><button id="sync-now" ${busy}>立即同步</button><button id="show-code">顯示復原碼</button></div><div id="recovery-panel" class="hidden"><p>復原碼等同這份存檔的鑰匙，請私人保存。換裝置時輸入即可取回。</p><textarea id="recovery-code" readonly aria-label="你的私人復原碼" spellcheck="false"></textarea><button id="copy-code">複製復原碼</button></div>` :
        `<button id="enable-cloud" class="primary" ${busy}>啟用雲端 · 保存目前進度</button>`}
      ${cloud.available ? `<div class="restore-section"><label for="recovery-input">從另一台裝置取回</label><div class="restore-row"><input id="recovery-input" type="password" autocomplete="off" placeholder="貼上 BW- 復原碼" spellcheck="false"><button id="find-save" ${busy}>查找</button></div>${preview ? `<div class="save-summary">${summary(sanitizeSave(preview.save))}</div><button id="restore-save" ${busy}>套用這份存檔 · 備份本機紀錄</button>` : ''}</div>` : ''}
      <div class="cloud-files"><button id="export-save">匯出本機存檔</button><button id="import-save" ${busy}>匯入存檔</button><input id="save-file" class="hidden" type="file" accept="application/json,.json"><button id="download-backup">下載替換前備份</button></div>
      <div class="dialog-actions cloud-actions"><button id="cloud-back" class="primary">返回主選單</button></div>`, false);
    $('cloud-message').textContent = notice || cloud.message || (cloud.status === 'ready' ? '進度已保存。記得保存復原碼，換裝置時就能接續遊玩。' : '');
    if ($('recovery-input')) $('recovery-input').value = typed;
    if (focused && $(focused)) $(focused).focus({ preventScroll: true });
    $('cloud-back').onclick = closeDialog;
    const act = (id, action) => { if ($(id)) $(id).onclick = async () => { notice = ''; try { await action(); } catch (e) { notice = e.message; } if (isOpen()) render(); }; };
    act('enable-cloud', () => cloud.create()); act('sync-now', () => cloud.sync());
    act('keep-local', () => cloud.resolve('local')); act('keep-remote', () => cloud.resolve('remote'));
    act('find-save', async () => { preview = null; preview = await cloud.previewRestore($('recovery-input').value); });
    act('restore-save', () => { cloud.restore(preview); preview = null; notice = '已取回進度。本機原有紀錄可從備份下載。'; });
    if ($('show-code')) $('show-code').onclick = () => { $('recovery-panel').classList.toggle('hidden'); $('recovery-code').value = cloud.state.code; };
    if ($('copy-code')) $('copy-code').onclick = async () => { try { await navigator.clipboard.writeText(cloud.state.code); $('copy-code').textContent = '已複製'; } catch { $('recovery-code').focus(); $('recovery-code').select(); $('copy-code').textContent = '請手動複製選取的文字'; } };
    act('export-save', () => download('bloodwake-save.json', { schema: 1, save: sanitizeSave(getSave()) }));
    act('download-backup', () => { const data = localStorage.getItem(BACKUP_KEY); if (!data) throw new Error('尚未替換過紀錄，沒有備份。'); download('bloodwake-backup.json', JSON.parse(data)); });
    $('import-save').onclick = () => $('save-file').click();
    $('save-file').onchange = async e => {
      try {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 4096) throw new Error('存檔檔案過大。');
        const data = JSON.parse(await file.text());
        if (!data.save || !Number.isFinite(data.save.souls) || !data.save.ranks) throw new Error('這不是 Bloodwake 存檔。');
        if (cloud.busy || !canApply()) throw new Error('請等待同步完成後再匯入。');
        cloud.backup(); applySave(sanitizeSave(data.save)); cloud.changed(); notice = '已匯入存檔，原有紀錄已備份。';
      } catch (err) { notice = err.message; }
      if (isOpen()) render();
    };
  }
  $('open-cloud').onclick = () => { notice = ''; preview = null; render(); $('cloud-back').focus({ preventScroll: true }); };
  window.addEventListener('online', () => cloud.available ? cloud.sync() : cloud.init());
  return cloud;
}
