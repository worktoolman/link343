(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`ledger.records.v1`,t=`ledger.categories.v1`,n=`ledger.budgets.v2`,r=`ledger.budget.v1`,i=30,a=[`餐饮`,`交通`,`购物`,`居住`,`娱乐`,`医疗`,`其他`],o=[`工资`,`兼职`,`红包`,`其他`];function s(e){return e===`income`?`income`:`expense`}function c(){return{expense:[...a],income:[...o]}}function l(e){if(!Array.isArray(e))return[];let t=[];for(let n of e){let e=String(n??``).trim().slice(0,8);e&&!t.includes(e)&&t.push(e)}return t}function u(){try{let e=localStorage.getItem(t);if(!e)return c();let n=JSON.parse(e),r={expense:l(n?.expense),income:l(n?.income)};return r.expense.length||(r.expense=[...a]),r.income.length||(r.income=[...o]),r}catch(e){return console.error(`[store] 分类读取失败，用预置分类兜底`,e),c()}}function d(e){localStorage.setItem(t,JSON.stringify(e))}function f(e){let t=String(e??``).trim();return t?t.length>8?{ok:!1,reason:`名称最多 8 个字`}:{ok:!0,name:t}:{ok:!1,reason:`名称不能为空`}}function p(e){return u()[s(e)].slice()}function m(e,t){let n=s(e),r=f(t);if(!r.ok)throw Error(r.reason);let a=u();if(a[n].includes(r.name))throw Error(`「${r.name}」已经存在`);if(a[n].length>=i)throw Error(`最多 ${i} 个分类，先删掉一些吧`);return a[n].push(r.name),d(a),r.name}function h(e,t,n){let r=s(e),i=String(t??``).trim(),a=f(n);if(!a.ok)throw Error(a.reason);if(a.name===i)return i;let o=u(),c=o[r].indexOf(i);if(c===-1)throw Error(`分类不存在`);if(o[r].includes(a.name))throw Error(`「${a.name}」已经存在`);o[r][c]=a.name,d(o);let l=O(),p=!1;for(let e of l)e.category===i&&s(e.type)===r&&(e.category=a.name,p=!0);p&&k(l);let m=F(),h=!1,g=e=>{for(let t of e.items)t.category===i&&(t.category=a.name,h=!0)};g(m.defaults);for(let e of Object.keys(m.months))g(m.months[e]);return h&&I(m),a.name}function g(e,t){let n=s(e),r=String(t??``).trim(),i=u(),a=i[n].indexOf(r);if(a===-1)return!1;if(i[n].length<=1)throw Error(`至少要保留一个分类`);return i[n].splice(a,1),d(i),!0}function _(e){return O().filter(t=>t.category===e).length}var v=e=>String(e).padStart(2,`0`);function y(e=new Date){return`${e.getFullYear()}-${v(e.getMonth()+1)}-${v(e.getDate())}`}function b(e){return e.slice(0,7)}function x(){return b(y())}function S(e,t){let[n,r]=e.split(`-`).map(Number),i=new Date(n,r-1+t,1);return`${i.getFullYear()}-${v(i.getMonth()+1)}`}function C(e){let[t,n,r]=e.split(`-`).map(Number);return`${n}月${r}日 周${`日一二三四五六`[new Date(t,n-1,r).getDay()]}`}function w(e){let[t,n]=e.split(`-`).map(Number);return`${t}年${n}月`}function T(e){return Math.round((Number(e)+2**-52)*100)/100}function E(e){return T(e).toLocaleString(`zh-CN`,{minimumFractionDigits:2,maximumFractionDigits:2})}function D(e){return e>100?`over`:e>=80?`warn`:`ok`}function O(){try{let t=localStorage.getItem(e);if(!t)return[];let n=JSON.parse(t);return Array.isArray(n)?n:[]}catch(e){return console.error(`[store] 读取失败，返回空列表`,e),[]}}function k(t){try{localStorage.setItem(e,JSON.stringify(t))}catch(e){throw console.error(`[store] 写入失败（可能是存储空间已满）`,e),e}}function A(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function ee(e){let t=T(e.amount);if(!Number.isFinite(t)||t<=0)throw Error(`金额必须是大于 0 的数字`);let n=s(e.type),r=e.date||y(),i={id:A(),amount:t,type:n,category:e.category||p(n)[0]||`其他`,note:(e.note||``).trim(),date:r,createdAt:Date.now()},a=O();return a.push(i),k(a),i}function te(e){let t=O(),n=t.filter(t=>t.id!==e);return n.length!==t.length&&(k(n),!0)}function j(){return O().sort((e,t)=>e.date===t.date?t.createdAt-e.createdAt:e.date<t.date?1:-1)}function ne(e){return j().filter(t=>b(t.date)===e)}function re(e=j()){let t=new Map;for(let n of e){let e=t.get(n.date);e||(e={date:n.date,records:[],expense:0,income:0},t.set(n.date,e)),e.records.push(n),n.type===`income`?e.income=T(e.income+n.amount):e.expense=T(e.expense+n.amount)}return[...t.values()]}function M(e=x()){let t=ne(e),n=0,r=0,i=new Map;for(let e of t){if(e.type===`income`){r=T(r+e.amount);continue}n=T(n+e.amount),i.set(e.category,T((i.get(e.category)||0)+e.amount))}let a=[...i.entries()].map(([e,t])=>({category:e,amount:t,percent:n>0?T(t/n*100):0})).sort((e,t)=>t.amount-e.amount||e.category.localeCompare(t.category,`zh`)),o=ae(e),s=B(e).map(e=>{let t=i.get(e.category)||0,n=T(e.amount-t),r=T(t/e.amount*100);return{...e,spent:t,remaining:n,usedPercent:r,state:D(r)}});return{month:e,expense:n,income:r,balance:T(r-n),count:t.length,byCategory:a,budget:o,remaining:o==null?null:T(o-n),usedPercent:o?T(n/o*100):null,budgetItems:s,itemsTotal:T(s.reduce((e,t)=>e+t.amount,0))}}function N(e){if(!e||typeof e!=`object`)return null;let t=T(e.amount);if(!Number.isFinite(t)||t<=0)return null;let n=String(e.name??``).trim().slice(0,8)||`未命名`;return{id:typeof e.id==`string`&&e.id?e.id:A(),name:n,category:String(e.category??``).trim(),amount:t}}function ie(e){let t=T(e?.total),n=Array.isArray(e?.items)?e.items.map(N).filter(Boolean):[];return{total:Number.isFinite(t)&&t>0?t:null,items:n}}function P(){return{defaults:{total:null,items:[]},months:{}}}function F(){let e=null;try{let t=localStorage.getItem(n);t&&(e=JSON.parse(t))}catch(e){console.error(`[store] 预算读取失败，按未设置处理`,e)}if(!e||typeof e!=`object`){try{let e=JSON.parse(localStorage.getItem(r)||`null`);if(e&&typeof e==`object`){let t=P(),n=T(e.default);Number.isFinite(n)&&n>0&&(t.defaults.total=n);for(let[n,r]of Object.entries(e.months&&typeof e.months==`object`?e.months:{})){let e=T(r);Number.isFinite(e)&&e>0&&(t.months[n]={total:e,items:[]})}return t}}catch(e){console.error(`[store] 旧预算迁移失败`,e)}return P()}let t=P();t.defaults=ie(e.defaults);let i=e.months&&typeof e.months==`object`?e.months:{};for(let[e,n]of Object.entries(i))t.months[e]=ie(n);return t}function I(e){localStorage.setItem(n,JSON.stringify(e))}function L(e){return{total:e.total,items:e.items.map(e=>({...e}))}}function R(e,t){return L(e.months[t]??e.defaults)}function z(e,t){let n=F(),r=R(n,e);return t(r),r.items=r.items.map(N).filter(Boolean),n.months[e]=r,n.defaults=L(r),I(n),r}function ae(e=x()){return R(F(),e).total}function oe(e,t=x()){let n=T(e);if(!Number.isFinite(n)||n<=0)throw Error(`生活费必须是大于 0 的数字`);return z(t,e=>{e.total=n}),n}function se(e=x()){z(e,e=>{e.total=null})}function B(e=x()){return R(F(),e).items}function ce(e={},t=x()){let n=f(e.name);if(!n.ok)throw Error(`额度名称${n.reason.replace(`名称`,``)}`);let r=T(e.amount);if(!Number.isFinite(r)||r<=0)throw Error(`额度必须是大于 0 的数字`);let i={id:A(),name:n.name,category:String(e.category??``).trim(),amount:r};return z(t,e=>{e.items.push(i)}),i}function V(e,t={},n=x()){let r=null;return z(n,n=>{let i=n.items.find(t=>t.id===e);if(!i)throw Error(`找不到这条额度`);if(t.name!==void 0){let e=f(t.name);if(!e.ok)throw Error(`额度名称${e.reason.replace(`名称`,``)}`);i.name=e.name}if(t.category!==void 0&&(i.category=String(t.category).trim()),t.amount!==void 0){let e=T(t.amount);if(!Number.isFinite(e)||e<=0)throw Error(`额度必须是大于 0 的数字`);i.amount=e}r={...i}}),r}function le(e,t=x()){return B(t).some(t=>t.id===e)?(z(t,t=>{t.items=t.items.filter(t=>t.id!==e)}),!0):!1}var H=null;function U(e,t=`info`){let n=document.querySelector(`.toast`);n||(n=document.createElement(`div`),n.className=`toast`,document.body.appendChild(n)),n.textContent=e,n.dataset.kind=t,n.offsetWidth,n.classList.add(`is-show`),clearTimeout(H),H=setTimeout(()=>n.classList.remove(`is-show`),1800)}function W(e){let t=String(e).replace(/[^\d.]/g,``),n=t.indexOf(`.`);n!==-1&&(t=t.slice(0,n+1)+t.slice(n+1).replace(/\./g,``));let[r,i]=t.split(`.`);return i!==void 0&&(t=`${r}.${i.slice(0,2)}`),r.length>1&&r.startsWith(`0`)&&(t=t.replace(/^0+/,``)||`0`+(i===void 0?``:`.`+i)),t}function G(e=10){try{navigator.vibrate?.(e)}catch{}}function K(e){return String(e).replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e])}function q({title:e=`确认操作`,message:t=``,confirmText:n=`确定`,cancelText:r=`取消`,danger:i=!1}={}){return new Promise(a=>{let o=document.createElement(`div`);o.className=`dlg-mask`,o.innerHTML=`
      <div class="dlg">
        <div class="dlg-title">${K(e)}</div>
        ${t?`<div class="dlg-msg">${K(t)}</div>`:``}
        <div class="dlg-actions">
          <button type="button" class="dlg-btn" data-act="cancel">${K(r)}</button>
          <button type="button" class="dlg-btn ${i?`is-danger`:`is-primary`}" data-act="ok">${K(n)}</button>
        </div>
      </div>
    `,document.body.appendChild(o),requestAnimationFrame(()=>o.classList.add(`is-show`));let s=!1;function c(e){s||(s=!0,o.classList.remove(`is-show`),setTimeout(()=>o.remove(),220),a(e))}o.addEventListener(`click`,e=>{if(e.target===o)return c(!1);let t=e.target.closest(`.dlg-btn`);t&&c(t.dataset.act===`ok`)})})}function ue(){let e=window.visualViewport;if(!e)return()=>{};let t=()=>{let t=window.innerHeight-e.height-e.offsetTop,n=t>60?Math.round(t):0;document.documentElement.style.setProperty(`--kb`,`${n}px`)};return t(),e.addEventListener(`resize`,t),e.addEventListener(`scroll`,t),window.addEventListener(`orientationchange`,t),t}function de(){document.addEventListener(`focusin`,e=>{let t=e.target;t instanceof HTMLElement&&t.matches(`input, select, textarea`)&&setTimeout(()=>{t.scrollIntoView({block:`center`,behavior:`smooth`})},260)})}function fe(e,t,n,r=550){let i=null,a=0,o=0,s=()=>{i&&=(clearTimeout(i),null)};e.addEventListener(`pointerdown`,e=>{let c=e.target.closest(t);c&&(a=e.clientX,o=e.clientY,s(),i=setTimeout(()=>{i=null,G(20),n(c)},r))}),e.addEventListener(`pointerup`,s),e.addEventListener(`pointercancel`,s),e.addEventListener(`pointermove`,e=>{i&&(Math.abs(e.clientX-a)>8||Math.abs(e.clientY-o)>8)&&s()}),e.addEventListener(`contextmenu`,e=>{e.target.closest(t)&&e.preventDefault()})}var J={id:`record`,label:`记账`,title:`记一笔`,subtitle:()=>`本月支出 ¥${E(M().expense)}`,icon:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8.5v7M8.5 12h7"/></svg>`,mount(e,t){let n=`expense`,r=p(n)[0],i=!1;e.innerHTML=`
      <div class="segmented" id="seg">
        <button type="button" data-type="expense" class="is-active">支出</button>
        <button type="button" data-type="income">收入</button>
      </div>

      <div class="amount-box" id="amountBox">
        <span class="amount-symbol">¥</span>
        <input
          id="amount"
          class="amount-input"
          type="text"
          inputmode="decimal"
          placeholder="0.00"
          autocomplete="off"
          enterkeyhint="done"
        />
      </div>

      <div class="field">
        <div class="field-label">
          <span>分类</span>
          <button type="button" class="field-action" id="manageBtn">管理</button>
        </div>
        <div class="category-grid" id="cats"></div>
      </div>

      <section class="inline-panel" id="catPanel" hidden></section>

      <div class="field">
        <div class="field-label"><span>备注</span></div>
        <input id="note" class="text-input" type="text" placeholder="选填" maxlength="30" />
      </div>

      <div class="field">
        <div class="field-label"><span>日期</span></div>
        <input id="date" class="text-input" type="date" value="${y()}" />
      </div>

      <button id="save" class="btn-primary" type="button">保存</button>
    `;let a=e.querySelector(`#seg`),o=e.querySelector(`#amountBox`),s=e.querySelector(`#amount`),c=e.querySelector(`#cats`),l=e.querySelector(`#manageBtn`),u=e.querySelector(`#catPanel`),d=e.querySelector(`#note`),f=e.querySelector(`#date`),v=e.querySelector(`#save`);function b(){let e=p(n);e.includes(r)||(r=e[0]),c.innerHTML=e.map(e=>`<button type="button" class="cat${e===r?` is-active`:``}" data-cat="${K(e)}" title="${K(e)}">${K(e)}</button>`).join(``)}c.addEventListener(`click`,e=>{let t=e.target.closest(`.cat`);t&&(r=t.dataset.cat,G(8),b())});function x(){if(!i){u.hidden=!0,u.innerHTML=``;return}let e=p(n);u.hidden=!1,u.innerHTML=`
        <div class="panel-head">
          <span class="panel-title">管理「${n===`income`?`收入`:`支出`}」分类</span>
          <button type="button" class="panel-done" data-act="cat-done">完成</button>
        </div>
        <div class="cat-edit-list">
          ${e.map(e=>`
            <div class="cat-edit" data-cat="${K(e)}">
              <input
                class="boxed-input"
                type="text"
                data-field="cat-name"
                value="${K(e)}"
                maxlength="8"
                autocomplete="off"
                aria-label="分类名"
              />
              <button type="button" class="icon-btn" data-act="cat-del" aria-label="删除分类">✕</button>
            </div>
          `).join(``)}
        </div>
        <div class="cat-edit-add">
          <input
            id="newCat"
            class="boxed-input"
            type="text"
            placeholder="新分类，如 宠物"
            maxlength="8"
            autocomplete="off"
          />
          <button type="button" class="mini-btn" data-act="cat-add">添加</button>
        </div>
        <p class="panel-hint">改名会同步已有记录和专项额度；删掉分类不会删掉已有记录</p>
      `}l.addEventListener(`click`,()=>{i=!i,l.textContent=i?`收起`:`管理`,l.classList.toggle(`is-active`,i),x(),i&&u.scrollIntoView({block:`nearest`,behavior:`smooth`})}),u.addEventListener(`click`,async e=>{if(e.target.closest(`[data-act="cat-done"]`)){i=!1,l.textContent=`管理`,l.classList.remove(`is-active`),x();return}if(e.target.closest(`[data-act="cat-add"]`)){S();return}let t=e.target.closest(`[data-act="cat-del"]`);if(!t)return;let a=t.closest(`.cat-edit`)?.dataset.cat;if(!a)return;let o=_(a);if(await q({title:`删除分类「${a}」？`,message:o?`已有 ${o} 笔记录用它，记录会保留，但以后不能再选这个分类`:`以后记账不能再选这个分类`,confirmText:`删除`,danger:!0}))try{g(n,a),r===a&&(r=p(n)[0]),b(),x(),G(15),U(`已删除`,`success`)}catch(e){U(e.message||`删除失败`,`error`)}}),u.addEventListener(`change`,e=>{let t=e.target.closest(`input[data-field="cat-name"]`);if(!t)return;let i=t.closest(`.cat-edit`),a=i?.dataset.cat,o=t.value.trim();if(!a||o===a){t.value=a||``;return}try{let e=h(n,a,o);i.dataset.cat=e,t.value=e,r===a&&(r=e),b(),G(8),U(`已改名`,`success`)}catch(e){t.value=a,U(e.message||`改名失败`,`error`)}});function S(){let e=u.querySelector(`#newCat`);if(!e)return;let t=e.value.trim();if(!t){U(`请输入分类名`,`error`),e.focus();return}try{m(n,t),G(12),b(),x();let e=u.querySelector(`#newCat`);e.value=``,e.focus(),U(`已添加「${t}」`,`success`)}catch(t){U(t.message||`添加失败`,`error`),e.focus()}}u.addEventListener(`keydown`,e=>{if(e.key!==`Enter`)return;let t=e.target.closest(`input`);t&&(e.preventDefault(),t.id===`newCat`?S():t.blur())});function C(){o.dataset.type=n,v.dataset.type=n;for(let e of a.children)e.classList.toggle(`is-active`,e.dataset.type===n);b(),x()}a.addEventListener(`click`,e=>{let t=e.target.closest(`button[data-type]`);t&&t.dataset.type!==n&&(n=t.dataset.type,G(8),C())}),s.addEventListener(`input`,()=>{let e=W(s.value);e!==s.value&&(s.value=e)}),s.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.preventDefault(),w())});function w(){let e=s.value.trim();if(!e||Number(e)<=0){U(`请输入金额`,`error`),s.focus();return}try{ee({amount:e,type:n,category:r,note:d.value,date:f.value||y()})}catch(e){U(e.message||`保存失败`,`error`);return}G(15),U(`已记下 ¥${E(e)}`,`success`),s.value=``,d.value=``,s.focus(),t?.setSubtitle(J.subtitle())}v.addEventListener(`click`,w),C(),s.focus()}},pe={id:`list`,label:`明细`,title:`明细`,icon:`<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8.5h5M9.5 12.5h5"/></svg>`,mount(e,t){function n(){let n=re();if(n.length===0){e.innerHTML=`
          <div class="placeholder">
            <div class="placeholder-icon">📋</div>
            <div class="placeholder-title">还没有记录</div>
            <div class="placeholder-hint">去「记账」页记下第一笔吧</div>
          </div>
        `,t?.setSubtitle(``);return}e.innerHTML=n.map(e=>`
        <section class="day-group">
          <header class="day-head">
            <span class="day-date">${C(e.date)}</span>
            <span class="day-sums tnum">
              ${e.expense?`<span class="amount-expense">-${E(e.expense)}</span>`:``}
              ${e.income?`<span class="amount-income">+${E(e.income)}</span>`:``}
            </span>
          </header>
          <div class="day-list">
            ${e.records.map(e=>`
              <article class="rec" data-id="${e.id}">
                <div class="rec-main">
                  <span class="rec-cat">${K(e.category)}</span>
                  ${e.note?`<span class="rec-note">${K(e.note)}</span>`:``}
                </div>
                <span class="rec-amount tnum ${e.type===`income`?`amount-income`:`amount-expense`}">${e.type===`income`?`+`:`-`}${E(e.amount)}</span>
              </article>
            `).join(``)}
          </div>
        </section>
      `).join(``)+`<p class="list-hint">长按某条记录可删除</p>`;let r=n.reduce((e,t)=>e+t.records.length,0);t?.setSubtitle(`共 ${r} 笔`)}fe(e,`.rec`,async e=>{let t=e.dataset.id;await q({title:`删除这条记录？`,message:`${e.querySelector(`.rec-cat`)?.textContent??``} ${e.querySelector(`.rec-amount`)?.textContent??``}`,confirmText:`删除`,danger:!0})&&(te(t)?(G(15),U(`已删除`,`success`),n()):(U(`删除失败，记录可能已不存在`,`error`),n()))}),n()}},Y=(e,t)=>e.target.closest?e.target.closest(t):null,X=[J,pe,{id:`stats`,label:`统计`,title:`统计`,icon:`<svg viewBox="0 0 24 24"><path d="M3.5 20.5h17"/><rect x="5" y="11" width="3.5" height="6.5" rx="1"/><rect x="10.5" y="6" width="3.5" height="11.5" rx="1"/><rect x="16" y="14" width="3.5" height="3.5" rx="1"/></svg>`,mount(e,t){let n=x(),r=!1,i=null;function a(e){if(e.budget==null)return`
          <div class="budget-card is-empty" data-act="set-budget" role="button" tabindex="0">
            <div class="donut-wrap is-empty">
              <svg class="donut" viewBox="0 0 36 36" aria-hidden="true">
                <circle class="donut-track" cx="18" cy="18" r="16" pathLength="100" />
              </svg>
              <div class="donut-center"><span class="donut-plus">+</span></div>
            </div>
            <div class="budget-detail">
              <div class="budget-prompt">设置本月生活费</div>
              <div class="budget-sub">看看这个月还能花多少</div>
            </div>
          </div>
        `;let t=e.usedPercent??0,n=e.remaining??0,r=Math.min(t,100);return`
        <div class="budget-card" data-act="set-budget" role="button" tabindex="0">
          <div class="donut-wrap" data-state="${D(t)}">
            <svg class="donut" viewBox="0 0 36 36" aria-hidden="true">
              <circle class="donut-track" cx="18" cy="18" r="16" pathLength="100" />
              <circle class="donut-fill" cx="18" cy="18" r="16" pathLength="100"
                      style="stroke-dasharray:${r} 100" />
            </svg>
            <div class="donut-center">
              <span class="donut-pct tnum">${t.toFixed(t>=100?0:1)}%</span>
              <span class="donut-cap">已用</span>
            </div>
          </div>
          <div class="budget-detail">
            <div class="budget-row">
              <span class="budget-key">生活费</span>
              <span class="budget-val tnum">¥${E(e.budget)}</span>
            </div>
            <div class="budget-row">
              <span class="budget-key">已用</span>
              <span class="budget-val amount-expense tnum">¥${E(e.expense)}</span>
            </div>
            <div class="budget-row">
              <span class="budget-key">${n<0?`超支`:`剩余`}</span>
              <span class="budget-val tnum ${n<0?`amount-expense`:`amount-income`}">¥${E(Math.abs(n))}</span>
            </div>
          </div>
        </div>
      `}function o(e){return e.budgetItems.length?`
        <div class="bi-list">
          ${e.budgetItems.map(e=>`
            <div class="bi-card" data-state="${e.state}">
              <div class="bi-head">
                <span class="bi-name">${K(e.name)}</span>
                <span class="bi-amount tnum">
                  ¥${E(e.spent)}<span class="bi-of">/ ¥${E(e.amount)}</span>
                </span>
              </div>
              <div class="bi-track">
                <div class="bi-fill" style="width:${Math.min(e.usedPercent,100)}%"></div>
              </div>
              <div class="bi-foot">
                <span class="bi-cat">${K(e.category||`未绑定分类`)}</span>
                <span class="bi-remain tnum ${e.remaining<0?`amount-expense`:``}">
                  ${e.remaining<0?`超支 ¥${E(-e.remaining)}`:`剩 ¥${E(e.remaining)}`}
                  · ${e.usedPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          `).join(``)}
        </div>
        <button type="button" class="add-row-btn" data-act="editor-open">
          + 编辑生活费 / 专项额度
        </button>
      `:`
          <button type="button" class="add-row-btn" data-act="editor-open">
            + 添加专项额度（如 饮食花销、购物）
          </button>
        `}function s(e,t,n=!1){let r=t.includes(e.category)?t:[e.category,...t].filter(Boolean);return`
        <div class="bi-edit" data-id="${K(String(e.id))}">
          <div class="bi-edit-row">
            <input
              class="boxed-input"
              type="text"
              data-field="name"
              value="${K(e.name??``)}"
              placeholder="名称，如 饮食花销"
              maxlength="8"
              autocomplete="off"
            />
            <button type="button" class="icon-btn" data-act="item-del" aria-label="删除这条额度">✕</button>
          </div>
          <div class="bi-edit-row">
            <select class="bi-select" data-field="category" aria-label="绑定分类">
              ${r.map(t=>`<option value="${K(t)}"${t===e.category?` selected`:``}>${K(t)}</option>`).join(``)}
            </select>
            <span class="editor-input-wrap">
              <span class="editor-symbol">¥</span>
              <input
                class="editor-input tnum"
                type="text"
                inputmode="decimal"
                data-field="amount"
                value="${e.amount===``||e.amount==null?``:K(String(e.amount))}"
                placeholder="额度"
                autocomplete="off"
              />
            </span>
          </div>
          ${n?`<div class="bi-edit-tip">填好名称和额度就会自动保存</div>`:``}
        </div>
      `}function c(e){let t=p(`expense`),n=e.budgetItems.map(e=>s(e,t)).join(``),r=i?s({id:`draft`,name:i.name,category:i.category,amount:i.amount},t,!0):``;return`
        <section class="inline-panel" id="budgetPanel">
          <div class="panel-head">
            <span class="panel-title">生活费与专项额度</span>
            <button type="button" class="panel-done" data-act="editor-done">完成</button>
          </div>

          <label class="editor-field">
            <span class="editor-label">生活费总额</span>
            <span class="editor-input-wrap">
              <span class="editor-symbol">¥</span>
              <input
                class="editor-input tnum"
                type="text"
                inputmode="decimal"
                data-field="total"
                value="${e.budget==null?``:e.budget}"
                placeholder="留空表示不设上限"
                autocomplete="off"
              />
            </span>
          </label>

          <div class="editor-sub">专项额度（按绑定的支出分类自动算已花多少）</div>
          <div class="bi-edit-list">
            ${n}${r}
            ${!n&&!r?`<p class="panel-hint">还没有专项额度，点下面的按钮加一条</p>`:``}
          </div>
          <button type="button" class="add-row-btn" data-act="item-add">+ 添加专项额度</button>
          <p class="panel-hint">改完直接生效，不用点保存；名称和额度都填好后自动存下</p>
        </section>
      `}function l(e){return e.count?`
        <div class="sum-cards">
          <div class="sum-card">
            <div class="sum-label">支出</div>
            <div class="sum-value amount-expense tnum">¥${E(e.expense)}</div>
          </div>
          <div class="sum-card">
            <div class="sum-label">收入</div>
            <div class="sum-value amount-income tnum">¥${E(e.income)}</div>
          </div>
        </div>

        <div class="balance-row">
          <span>结余</span>
          <span class="balance-value tnum ${e.balance>=0?`amount-income`:`amount-expense`}">
            ${e.balance>=0?`+`:`−`}¥${E(Math.abs(e.balance))}
          </span>
        </div>

        <div class="field">
          <div class="field-label"><span>支出构成</span></div>
          ${e.byCategory.length?`<div class="cat-stats">${e.byCategory.map(e=>`
                <div class="cat-stat">
                  <div class="cat-stat-row">
                    <span class="cat-stat-name">${K(e.category)}</span>
                    <span class="cat-stat-pct tnum">${e.percent.toFixed(1)}%</span>
                    <span class="cat-stat-amount tnum">¥${E(e.amount)}</span>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${e.percent}%"></div>
                  </div>
                </div>
              `).join(``)}</div>`:`<p class="muted-note">本月没有支出</p>`}
        </div>
      `:`
          <div class="placeholder">
            <div class="placeholder-icon">📊</div>
            <div class="placeholder-title">这个月还没有记录</div>
            <div class="placeholder-hint">换个月份看看，或者去记一笔</div>
          </div>
        `}function u(){let t=M(n),i=e.querySelector(`#summaryZone`),s=e.querySelector(`#itemsZone`);i&&(i.innerHTML=a(t)),s&&(s.innerHTML=r?``:o(t))}function d(){let i=M(n),s=n<x(),u=e.scrollTop;e.innerHTML=`
        <div class="month-nav">
          <button type="button" class="month-btn" data-act="prev" aria-label="上个月">‹</button>
          <span class="month-label">${w(n)}</span>
          <button type="button" class="month-btn" data-act="next" aria-label="下个月" ${s?``:`disabled`}>›</button>
        </div>

        <div id="summaryZone">${a(i)}</div>
        <div id="itemsZone">${r?``:o(i)}</div>
        ${r?c(i):``}
        <div id="lowerZone">${l(i)}</div>
      `,e.scrollTop=u,t?.setSubtitle(i.count?`${i.count} 笔记录`:``)}function f(){r||(r=!0,d(),e.querySelector(`#budgetPanel`)?.scrollIntoView({block:`nearest`,behavior:`smooth`}))}function m(){r=!1,i=null,d()}function h(){if(i){U(`先把上面这条填完`,`error`),e.querySelector(`.bi-edit[data-id="draft"] [data-field="name"]`)?.focus();return}i={name:``,category:p(`expense`)[0]||``,amount:``},d();let t=e.querySelector(`.bi-edit[data-id="draft"] [data-field="name"]`);t?.focus(),t?.scrollIntoView({block:`center`,behavior:`smooth`})}function g(e){i&&e&&(i.name=e.querySelector(`[data-field="name"]`)?.value??i.name,i.category=e.querySelector(`[data-field="category"]`)?.value??i.category,i.amount=e.querySelector(`[data-field="amount"]`)?.value??i.amount)}function _(e){if(!i)return;g(e);let t=String(i.name??``).trim(),r=Number(i.amount);if(!(!t||!Number.isFinite(r)||r<=0))try{let a=ce({name:t,category:i.category,amount:r},n);i=null,e.dataset.id=a.id,e.querySelector(`.bi-edit-tip`)?.remove();let o=e.querySelector(`[data-field="name"]`),s=e.querySelector(`[data-field="amount"]`);o&&(o.value=a.name),s&&(s.value=a.amount),G(12),U(`已添加专项额度`,`success`),u()}catch(e){U(e.message||`添加失败`,`error`)}}function v(e){let t=e.value.trim();try{t?(oe(t,n),G(10)):(se(n),G(10),U(`已取消生活费上限`,`success`)),u()}catch(e){U(e.message||`设置失败`,`error`),d()}}function y(e,t){let r=e.dataset.id,i=t.dataset.field;try{if(i===`name`){let e=t.value.trim();if(!e)throw Error(`名称不能为空`);V(r,{name:e},n),t.value=e}else if(i===`category`)V(r,{category:t.value},n);else if(i===`amount`){let e=t.value.trim();if(!e)throw Error(`额度不能为空`);t.value=V(r,{amount:e},n).amount}u()}catch(e){U(e.message||`保存失败`,`error`),d()}}e.addEventListener(`click`,async t=>{let r=Y(t,`.month-btn`);if(r){if(r.disabled)return;let t=r.dataset.act===`prev`?-1:1,a=S(n,t);if(a>x())return;n=a,i=null,d(),e.scrollTop=0;return}if(Y(t,`[data-act="set-budget"]`)){f();return}if(Y(t,`[data-act="editor-open"]`)){f();return}if(Y(t,`[data-act="editor-done"]`)){m();return}if(Y(t,`[data-act="item-add"]`)){h();return}let a=Y(t,`[data-act="item-del"]`);if(a){let e=a.closest(`.bi-edit`);if(!e)return;if(e.dataset.id===`draft`){i=null,d();return}if(!await q({title:`删除「${M(n).budgetItems.find(t=>t.id===e.dataset.id)?.name??`这条额度`}」？`,message:`只删额度设置，已经记下的账不受影响`,confirmText:`删除`,danger:!0}))return;le(e.dataset.id,n)&&(G(15),U(`已删除`,`success`)),d()}}),e.addEventListener(`input`,e=>{let t=Y(e,`[data-field]`);if(!t)return;let n=t.dataset.field;if(n===`total`||n===`amount`){let e=W(t.value);e!==t.value&&(t.value=e)}let r=t.closest(`.bi-edit`);i&&r?.dataset.id===`draft`&&g(r)}),e.addEventListener(`change`,e=>{let t=Y(e,`[data-field]`);if(!t)return;if(t.dataset.field===`total`){v(t);return}let n=t.closest(`.bi-edit`);n&&(n.dataset.id===`draft`?_(n):y(n,t))}),e.addEventListener(`keydown`,e=>{if(e.key!==`Enter`)return;let t=Y(e,`[data-field]`);t&&(e.preventDefault(),t.blur())}),d()}}],Z=document.querySelector(`#app`);Z.innerHTML=`
  <header class="app-header">
    <h1 class="app-title" id="title"></h1>
    <p class="app-subtitle" id="subtitle"></p>
  </header>
  <main class="app-main" id="body"></main>
  <nav class="tabbar" id="tabbar"></nav>
`;var me=Z.querySelector(`#title`),he=Z.querySelector(`#subtitle`),Q=Z.querySelector(`#body`),$=Z.querySelector(`#tabbar`);ue(),de(),$.innerHTML=X.map(e=>`
  <button class="tab" data-id="${e.id}" type="button">
    ${e.icon}
    <span class="tab-label">${e.label}</span>
  </button>
`).join(``);var ge=[...$.querySelectorAll(`.tab`)],_e=null;function ve(e){he.textContent=e??``,he.hidden=!e}function ye(e){let t=X.find(t=>t.id===e);if(!t||e===_e)return;_e=e,me.textContent=t.title,ve(typeof t.subtitle==`function`?t.subtitle():t.subtitle);let n=document.createElement(`main`);n.className=`app-main`,n.id=`body`,Q.replaceWith(n),Q=n,t.mount(Q,{setSubtitle:ve});for(let t of ge)t.classList.toggle(`is-active`,t.dataset.id===e)}$.addEventListener(`click`,e=>{let t=e.target.closest(`.tab`);t&&ye(t.dataset.id)}),`serviceWorker`in navigator&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`./sw.js`).catch(e=>{console.warn(`[sw] 注册失败`,e)})}),ye(X[0].id);