import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// إعدادات مشروع Firebase الخاص بك
const firebaseConfig = {
    apiKey: "AIzaSyBA744d7tAsZDYYxEsmkXANViHW5cq8roo",
    authDomain: "ismailia-churches.firebaseapp.com",
    projectId: "ismailia-churches",
    storageBucket: "ismailia-churches.firebasestorage.app",
    messagingSenderId: "684422006412",
    appId: "1:684422006412:web:e1d25447c95b2c9a725da9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// خريطة أكواد الخدام (كل كود مخصص لكنيسة ومرحلة معينة)
const SERVANT_MAP = {
    // --- كنيسة السيدة العذراء مريم ---
    "9855": { id: "church_1", name: "كنيسة السيدة العذراء مريم", stage: "ملايكة" },
    "9856": { id: "church_1", name: "كنيسة السيدة العذراء مريم", stage: "ابتدائي" },
    "9857": { id: "church_1", name: "كنيسة السيدة العذراء مريم", stage: "إعدادي" },
    "9858": { id: "church_1", name: "كنيسة السيدة العذراء مريم", stage: "ثانوي" },
    
    // --- كنيسة الأنبا بولا ومارمينا ---
    "9874": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا", stage: "ملايكة" },
    "9875": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا", stage: "ابتدائي" },
    "9876": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا", stage: "إعدادي" },
    "9877": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا", stage: "ثانوي" },

    // --- كنيسة الشهيد العظيم مارجرجس ---
    "1122": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس", stage: "ملايكة" },
    "1123": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس", stage: "ابتدائي" },
    "1124": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس", stage: "إعدادي" },
    "1125": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس", stage: "ثانوي" },

    // --- كنيسة الأنبا بيشوي ---
    "3344": { id: "church_4", name: "كنيسة الأنبا بيشوي", stage: "ملايكة" },
    "3345": { id: "church_4", name: "كنيسة الأنبا بيشوي", stage: "ابتدائي" },
    "3346": { id: "church_4", name: "كنيسة الأنبا بيشوي", stage: "إعدادي" },
    "3347": { id: "church_4", name: "كنيسة الأنبا بيشوي", stage: "ثانوي" },

    // --- كنيسة الملاك ميخائيل ---
    "0358": { id: "church_5", name: "كنيسة الملاك ميخائيل", stage: "ملايكة" },
    "8795": { id: "church_5", name: "كنيسة الملاك ميخائيل", stage: "ابتدائي" },
    "5657": { id: "church_5", name: "كنيسة الملاك ميخائيل", stage: "إعدادي" },
    "5658": { id: "church_5", name: "كنيسة الملاك ميخائيل", stage: "ثانوي" }
};

let currentChurch = null;
let currentStage = null;
let unsubscribeRealtime = null;

// تحويل صيغة الوقت والتاريخ إلى نظام 12 ساعة (صباحاً/مساءً)
function format12Hour(datetimeLocalValue) {
    if (!datetimeLocalValue) return "";
    const date = new Date(datetimeLocalValue);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${year}-${month}-${day} | ${hours}:${minutes} ${ampm}`;
}

// معالجة الدخول الموحد (خادم أو مخدوم)
window.handleUnifiedLogin = async function(e) {
    e.preventDefault();
    const inputVal = document.getElementById('user-input').value.trim();
    const churchSelect = document.getElementById('user-church');
    const stageSelect = document.getElementById('user-stage');
    const gradeSelect = document.getElementById('user-grade');
    const errorEl = document.getElementById('login-error');

    errorEl.textContent = "";

    // 1. الدخول كـ خادم (التحقق بالكود الخاص)
    if (SERVANT_MAP[inputVal]) {
        const servantData = SERVANT_MAP[inputVal];
        currentChurch = { id: servantData.id, name: servantData.name };
        currentStage = servantData.stage;

        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('church-title').textContent = currentChurch.name;
        document.getElementById('servant-welcome').textContent = `لوحة التحكم الخادمة بـ ${currentChurch.name} - مرحلة (${currentStage})`;
        
        const listTitle = document.getElementById('list-title');
        if (listTitle) {
            listTitle.textContent = `قائمة مخدومين مرحلة (${currentStage})`;
        }
        
        // ضبط المرحلة تلقائياً في استمارة إضافة المخدوم
        document.getElementById('stage').value = currentStage;
        
        listenToChurchDataRealtime();
        return;
    }

    // 2. الدخول كـ مخدوم
    const churchId = churchSelect.value;
    const stageVal = stageSelect.value;
    const gradeVal = gradeSelect.value;

    if (!churchId || !stageVal || !gradeVal) {
        errorEl.textContent = "عذراً للمخدومين: يرجى اختيار الكنيسة والمرحلة والصف الدراسي أولاً.";
        return;
    }

    errorEl.textContent = "جاري البحث...";

    try {
        const q = query(
            collection(db, "served_persons"), 
            where("churchId", "==", churchId),
            where("stage", "==", stageVal),
            where("grade", "==", gradeVal),
            where("fullname", "==", inputVal)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            errorEl.textContent = "";
            const kidData = querySnapshot.docs[0].data();
            const selectedChurchName = churchSelect.options[churchSelect.selectedIndex].text;
            
            document.getElementById('p-church-name').textContent = selectedChurchName;
            document.getElementById('p-name').textContent = kidData.fullname;
            document.getElementById('p-address').textContent = kidData.address;
            document.getElementById('p-phone').textContent = kidData.phone;
            document.getElementById('p-dob').textContent = kidData.dob;
            document.getElementById('p-age').textContent = kidData.age;
            document.getElementById('p-stage-grade').textContent = `${kidData.stage} - الصف ${kidData.grade}`;
            document.getElementById('p-next').textContent = format12Hour(kidData.nextSession);
            
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('served-page').classList.remove('hidden');
        } else {
            errorEl.textContent = "لم يتم العثور على الاسم بنفس هذه الكنيسة والمرحلة والصف، يرجى التأكد من البيانات.";
        }
    } catch (err) {
        console.error(err);
        errorEl.textContent = "حدث خطأ أثناء الاتصال بالخادم.";
    }
};

// الاستماع اللحظي لبيانات مرحلة الخادم
function listenToChurchDataRealtime() {
    const tbody = document.getElementById('served-list');
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>جاري تحميل البيانات...</td></tr>";

    const q = query(
        collection(db, "served_persons"), 
        where("churchId", "==", currentChurch.id),
        where("stage", "==", currentStage)
    );
    
    unsubscribeRealtime = onSnapshot(q, (snapshot) => {
        tbody.innerHTML = "";
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan='4' style='text-align:center;'>لا يوجد مخدومين مضافين حالياً في مرحلة (${currentStage}).</td></tr>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const person = docSnap.data();
            const id = docSnap.id;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${person.fullname}</strong></td>
                <td><span class="badge">الصف ${person.grade}</span></td>
                <td>${format12Hour(person.nextSession)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-warning" onclick='editPerson("${id}", ${JSON.stringify(person)})'>تعديل</button>
                        <button class="btn btn-danger" onclick='deletePerson("${id}")'>حذف</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (typeof window.filterServedList === "function") {
            window.filterServedList();
        }
    });
}

// حساب العمر تلقائياً
window.calculateAge = function() {
    const dobInput = document.getElementById('dob').value;
    if (!dobInput) return;
    
    const dob = new Date(dobInput);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    document.getElementById('age').value = Math.abs(ageDate.getUTCFullYear() - 1970);
};

// حفظ أو تحديث بيانات المخدوم
window.saveServedPerson = async function(e) {
    e.preventDefault();
    
    const docId = document.getElementById('edit-doc-id').value;
    const personData = {
        churchId: currentChurch.id,
        fullname: document.getElementById('fullname').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        dob: document.getElementById('dob').value,
        age: document.getElementById('age').value,
        stage: document.getElementById('stage').value,
        grade: document.getElementById('grade').value,
        nextSession: document.getElementById('next-session').value
    };

    try {
        if (!docId) {
            await addDoc(collection(db, "served_persons"), personData);
        } else {
            await updateDoc(doc(db, "served_persons", docId), personData);
        }
        resetForm();
    } catch (err) {
        alert("حدث خطأ أثناء الحفظ: " + err.message);
    }
};

// تجهيز نموذج التعديل
window.editPerson = function(id, person) {
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('fullname').value = person.fullname;
    document.getElementById('phone').value = person.phone;
    document.getElementById('address').value = person.address;
    document.getElementById('dob').value = person.dob;
    document.getElementById('age').value = person.age;
    document.getElementById('stage').value = person.stage;
    document.getElementById('grade').value = person.grade;
    document.getElementById('next-session').value = person.nextSession;
    
    document.getElementById('form-title').textContent = "تعديل البيانات";
    document.getElementById('submit-btn').textContent = "تحديث";
    document.getElementById('cancel-btn').classList.remove('hidden');
};

// حذف مخدوم
window.deletePerson = async function(id) {
    if (confirm("هل أنت تأكد من الحذف؟")) {
        await deleteDoc(doc(db, "served_persons", id));
    }
};

// إعادة ضبط النموذج
window.resetForm = function() {
    document.getElementById('served-form').reset();
    document.getElementById('edit-doc-id').value = "";
    document.getElementById('form-title').textContent = "إضافة مخدوم جديد";
    document.getElementById('submit-btn').textContent = "حفظ البيانات";
    document.getElementById('cancel-btn').classList.add('hidden');
    
    if (currentStage) {
        document.getElementById('stage').value = currentStage;
    }
};

// الرجوع لصفحة الدخول للمخدوم
window.backToLogin = function() {
    document.getElementById('served-page').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('user-input').value = "";
};

// تسجيل خروج الخادم
window.logout = function() {
    if (unsubscribeRealtime) unsubscribeRealtime();
    currentChurch = null;
    currentStage = null;
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('user-input').value = "";
    resetForm();
};

// تصفية وحس البحث باسم المخدوم في الجدول
window.filterServedList = function() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    const filter = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll('#served-list tr');

    rows.forEach(row => {
        const nameCell = row.querySelector('td strong');
        if (nameCell) {
            const nameText = nameCell.textContent || nameCell.innerText;
            if (nameText.toLowerCase().indexOf(filter) > -1) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    });
};
