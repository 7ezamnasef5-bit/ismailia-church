import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ضع بيانات مشروعك الخاصة بـ Firebase هنا
const firebaseConfig = {
    apiKey: "AIzaSyBA744d7tAsZDYYxEsmkXANViHW5cq8roo",
    authDomain: "ismailia-churches.firebaseapp.com",
    projectId: "ismailia-churches",
    storageBucket: "ismailia-churches.firebasestorage.app",
    messagingSenderId: "684422006412" ,
    appId: "1:684422006412:web:e1d25447c95b2c9a725da9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3 أكواد مختلفة لكل كنيسة
const CHURCH_MAP = {
    // كنيسة السيدة العذراء مريم
    "9855": { id: "church_1", name: "كنيسة السيدة العذراء مريم" },
    "9856": { id: "church_1", name: "كنيسة السيدة العذراء مريم" },
    "9857": { id: "church_1", name: "كنيسة السيدة العذراء مريم" },
    
    // كنيسة الأنبا بولا ومارمينا
    "9874": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا" },
    "9875": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا" },
    "9876": { id: "church_2", name: "كنيسة الأنبا بولا ومارمينا" },

    // كنيسة الشهيد العظيم مارجرجس
    "1122": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس" },
    "1123": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس" },
    "1124": { id: "church_3", name: "كنيسة الشهيد العظيم مارجرجس" },

    // كنيسة الأنبا بيشوي
    "3344": { id: "church_4", name: "كنيسة الأنبا بيشوي" },
    "3345": { id: "church_4", name: "كنيسة الأنبا بيشوي" },
    "3346": { id: "church_4", name: "كنيسة الأنبا بيشوي" },

    // كنيسة الملاك ميخائيل
    "0358": { id: "church_5", name: "كنيسة الملاك ميخائيل" },
    "8795": { id: "church_5", name: "كنيسة الملاك ميخائيل" },
    "5657": { id: "church_5", name: "كنيسة الملاك ميخائيل" }

};

let currentChurch = null;
let unsubscribeRealtime = null; // لإيقاف الاستماع للبيانات عند الخروج

// تحويل الوقت لـ 12 ساعة
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

// معالجة الدخول الموحد
window.handleUnifiedLogin = async function(e) {
    e.preventDefault();
    const inputVal = document.getElementById('user-input').value.trim();
    const churchSelect = document.getElementById('user-church');
    const churchId = churchSelect.value;
    const errorEl = document.getElementById('login-error');

    errorEl.textContent = "";

    // 1. الدخول كـ خادم عبر الأكواد
    if (CHURCH_MAP[inputVal]) {
        currentChurch = CHURCH_MAP[inputVal];
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('church-title').textContent = currentChurch.name;
        document.getElementById('servant-welcome').textContent = `لوحة التحكم الخادمة بـ ${currentChurch.name}`;
        
        // تفعيل الاستماع اللحظي للبيانات
        listenToChurchDataRealtime();
        return;
    }

    // 2. الدخول كـ مخدوم (البحث باسمه)
    if (!churchId) {
        errorEl.textContent = "يرجى اختيار الكنيسة لرؤية بيانات المخدوم.";
        return;
    }

    errorEl.textContent = "جاري البحث...";

    try {
        const q = query(
            collection(db, "served_persons"), 
            where("churchId", "==", churchId),
            where("fullname", "==", inputVal)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            errorEl.textContent = "";
            const kidData = querySnapshot.docs[0].data();
            const selectedChurchName = churchSelect.options[churchSelect.selectedIndex].text;
            
            // تعبئة الصفحة الخاصة بالمخدوم
            document.getElementById('p-church-name').textContent = selectedChurchName;
            document.getElementById('p-name').textContent = kidData.fullname;
            document.getElementById('p-address').textContent = kidData.address;
            document.getElementById('p-phone').textContent = kidData.phone;
            document.getElementById('p-dob').textContent = kidData.dob;
            document.getElementById('p-age').textContent = kidData.age;
            document.getElementById('p-grade').textContent = kidData.grade;
            document.getElementById('p-next').textContent = format12Hour(kidData.nextSession);
            
            // الانتقال الكامل للصفحة
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('served-page').classList.remove('hidden');
        } else {
            errorEl.textContent = "لم يتم العثور على الاسم بنفس هذه الكنيسة، يُرجى التأكد من كتابة الاسم الثلاثي بالكامل.";
        }
    } catch (err) {
        console.error(err);
        errorEl.textContent = "حدث خطأ أثناء الاتصال بالخادم.";
    }
};

// الاستماع اللحظي لجدول المخدومين (Realtime Updates)
function listenToChurchDataRealtime() {
    const tbody = document.getElementById('served-list');
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>جاري تحميل البيانات...</td></tr>";

    const q = query(collection(db, "served_persons"), where("churchId", "==", currentChurch.id));
    
    // التحديث التلقائي الفوري دون الحاجة لتحديث الصفحة
    unsubscribeRealtime = onSnapshot(q, (snapshot) => {
        tbody.innerHTML = "";
        if (snapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>لا يوجد مخدومين مضافين حالياً.</td></tr>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const person = docSnap.data();
            const id = docSnap.id;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${person.fullname}</strong></td>
                <td>${person.grade}</td>
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
    });
}

// حساب العمر
window.calculateAge = function() {
    const dobInput = document.getElementById('dob').value;
    if (!dobInput) return;
    
    const dob = new Date(dobInput);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    document.getElementById('age').value = Math.abs(ageDate.getUTCFullYear() - 1970);
};

// حفظ البيانات
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
        grade: document.getElementById('grade').value.trim(),
        nextSession: document.getElementById('next-session').value
    };

    try {
        if (!docId) {
            await addDoc(collection(db, "served_persons"), personData);
        } else {
            await updateDoc(doc(db, "served_persons", docId), personData);
        }
        resetForm(); // سينعكس التغيير فوراً في الجدول بفضل onSnapshot!
    } catch (err) {
        alert("حدث خطأ أثناء الحفظ: " + err.message);
    }
};

// تعديل
window.editPerson = function(id, person) {
    document.getElementById('edit-doc-id').value = id;
    document.getElementById('fullname').value = person.fullname;
    document.getElementById('phone').value = person.phone;
    document.getElementById('address').value = person.address;
    document.getElementById('dob').value = person.dob;
    document.getElementById('age').value = person.age;
    document.getElementById('grade').value = person.grade;
    document.getElementById('next-session').value = person.nextSession;
    
    document.getElementById('form-title').textContent = "تعديل البيانات";
    document.getElementById('submit-btn').textContent = "تحديث";
    document.getElementById('cancel-btn').classList.remove('hidden');
};

// حذف
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
};

// الرجوع من صفحة المخدوم
window.backToLogin = function() {
    document.getElementById('served-page').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('user-input').value = "";
};

// تسجيل الخروج الخادم
window.logout = function() {
    if (unsubscribeRealtime) unsubscribeRealtime(); // إيقاف الاستماع
    currentChurch = null;
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('user-input').value = "";
    resetForm();
};