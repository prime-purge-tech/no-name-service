// Configuration Firebase (À REMPLACER PAR VOS DONNÉES)
const firebaseConfig = {
    apiKey: "AIzaSyBzCvdfEUUcBtryUqekRh91ZuHai4WG3vU",
    authDomain: "prime-purge-service.firebaseapp.com",
    projectId: "prime-purge-service",
    storageBucket: "prime-purge-service.firebasestorage.app",
    messagingSenderId: "181654423682",
    appId: "1:181654423682:web:c85e3e796fc2cff27c8c9b"
};

// Initialisation Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let currentPostId = null;

// OWNER EMAIL (seul cet email peut modifier le certificat)
const OWNER_EMAIL = "noahtoure8@gmail.com";

// ============ CERTIFICAT META ============
async function loadCertificate() {
    const certDoc = await db.collection('settings').doc('certificate').get();
    const certText = certDoc.exists ? certDoc.data().text : "Certificat Meta : Non certifié";
    document.getElementById('certificateText').innerText = certText;
    
    if (currentUser && currentUser.email === OWNER_EMAIL) {
        document.getElementById('certificateContainer').style.display = 'block';
    } else {
        document.getElementById('certificateContainer').style.display = 'none';
    }
}

function showCertificateEdit() {
    if (currentUser && currentUser.email === OWNER_EMAIL) {
        document.getElementById('certificateEdit').style.display = 'block';
    }
}

function hideCertificateEdit() {
    document.getElementById('certificateEdit').style.display = 'none';
}

async function saveCertificate() {
    const newCert = document.getElementById('certificateInput').value;
    await db.collection('settings').doc('certificate').set({ text: `Certificat Meta : ${newCert}` });
    await loadCertificate();
    hideCertificateEdit();
}

// ============ AUTHENTIFICATION ============
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            avatar: name.charAt(0).toUpperCase(),
            avatarUrl: null,
            followers: [],
            following: [],
            createdAt: new Date()
        });
        alert('Inscription réussie !');
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

async function logout() {
    await auth.signOut();
}

// ============ AUTH STATE LISTENER ============
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (!userData) return;
        
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userName').innerText = userData.name;
        document.getElementById('sidebarUserName').innerText = userData.name;
        
        // Photo de profil
        const profileImg = document.getElementById('profileAvatarImg');
        if (userData.avatarUrl) {
            profileImg.src = userData.avatarUrl;
            profileImg.style.display = 'block';
        } else {
            profileImg.style.display = 'block';
            profileImg.src = '';
        }
        
        await loadCertificate();
        loadFeed();
        loadStories();
        loadUserStats();
        loadSuggestedUsers();
    } else {
        currentUser = null;
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
});

// ============ PHOTO DE PROFIL ============
async function openAvatarModal() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    if (userData.avatarUrl) {
        document.getElementById('avatarPreview').src = userData.avatarUrl;
    } else {
        document.getElementById('avatarPreview').src = '';
    }
    document.getElementById('avatarModal').style.display = 'flex';
}

function closeAvatarModal() {
    document.getElementById('avatarModal').style.display = 'none';
}

function previewAvatar() {
    const file = document.getElementById('avatarInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('avatarPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function compressImage(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };
        };
    });
}

async function uploadAvatar() {
    const file = document.getElementById('avatarInput').files[0];
    if (!file) {
        alert('Sélectionnez une image d\'abord');
        return;
    }
    
    try {
        const compressedBlob = await compressImage(file, 500, 500);
        const storageRef = storage.ref(`avatars/${currentUser.uid}.jpg`);
        await storageRef.put(compressedBlob);
        const avatarUrl = await storageRef.getDownloadURL();
        
        await db.collection('users').doc(currentUser.uid).update({
            avatarUrl: avatarUrl
        });
        
        closeAvatarModal();
        
        // Mettre à jour l'affichage
        document.getElementById('profileAvatarImg').src = avatarUrl;
        
        alert('Photo de profil mise à jour !');
        loadFeed();
    } catch (error) {
        alert('Erreur lors de l\'upload: ' + error.message);
    }
}

// ============ PUBLICATIONS ============
async function createPost() {
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];
    
    if (!content && !imageFile) {
        alert('Écrivez quelque chose ou ajoutez une image');
        return;
    }
    
    let imageUrl = null;
    
    if (imageFile) {
        try {
            const compressedBlob = await compressImage(imageFile, 800, 800);
            const storageRef = storage.ref(`posts/${Date.now()}_${imageFile.name}`);
            await storageRef.put(compressedBlob);
            imageUrl = await storageRef.getDownloadURL();
        } catch (error) {
            alert('Erreur lors de l\'upload de l\'image');
            return;
        }
    }
    
    await db.collection('posts').add({
        userId: currentUser.uid,
        content: content,
        imageUrl: imageUrl,
        likes: [],
        comments: [],
        createdAt: new Date()
    });
    
    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    loadFeed();
}

async function loadFeed() {
    const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    
    for (const doc of postsSnapshot.docs) {
        const post = { id: doc.id, ...doc.data() };
        const userDoc = await db.collection('users').doc(post.userId).get();
        const user = userDoc.data();
        if (!user) continue;
        
        const isLiked = post.likes && post.likes.includes(currentUser.uid);
        
        const avatarHtml = user.avatarUrl 
            ? `<img src="${user.avatarUrl}" class="post-avatar-img" onclick="goToProfile('${post.userId}')">`
            : `<div class="post-avatar" onclick="goToProfile('${post.userId}')">${user.avatar || '?'}</div>`;
        
        const postDiv = document.createElement('div');
        postDiv.className = 'post-card';
        postDiv.innerHTML = `
            <div class="post-header">
                ${avatarHtml}
                <div class="post-info">
                    <h4 onclick="goToProfile('${post.userId}')">${user.name}</h4>
                    <span>${post.createdAt ? new Date(post.createdAt.toDate()).toLocaleString() : 'Récent'}</span>
                </div>
            </div>
            ${post.content ? `<div class="post-text">${post.content.replace(/\n/g, '<br>')}</div>` : ''}
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onclick="openImageModal('${post.imageUrl}')">` : ''}
            <div class="post-actions">
                <div onclick="toggleLike('${post.id}')" class="${isLiked ? 'liked' : ''}">
                    <i class="fas fa-thumbs-up"></i> ${post.likes ? post.likes.length : 0} J'aime
                </div>
                <div onclick="openCommentModal('${post.id}')">
                    <i class="far fa-comment"></i> ${post.comments ? post.comments.length : 0} Commentaires
                </div>
                <div onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i> Partager
                </div>
            </div>
        `;
        feed.appendChild(postDiv);
    }
}

async function toggleLike(postId) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    const post = postDoc.data();
    const likes = post.likes || [];
    
    if (likes.includes(currentUser.uid)) {
        await postRef.update({ likes: likes.filter(id => id !== currentUser.uid) });
    } else {
        await postRef.update({ likes: [...likes, currentUser.uid] });
    }
    loadFeed();
}

// ============ COMMENTAIRES ============
async function openCommentModal(postId) {
    currentPostId = postId;
    const postDoc = await db.collection('posts').doc(postId).get();
    const post = postDoc.data();
    
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    
    const comments = post.comments || [];
    for (const comment of comments) {
        const userDoc = await db.collection('users').doc(comment.userId).get();
        const user = userDoc.data();
        
        const avatarHtml = user && user.avatarUrl 
            ? `<img src="${user.avatarUrl}" class="comment-avatar-img">`
            : `<div class="comment-avatar">${user ? user.avatar : '?'}</div>`;
        
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            ${avatarHtml}
            <div class="comment-text">
                <div class="comment-name">${user ? user.name : 'Inconnu'}</div>
                <div class="comment-content">${comment.text}</div>
            </div>
        `;
        commentsList.appendChild(commentDiv);
    }
    
    document.getElementById('commentModal').style.display = 'flex';
}

async function addComment() {
    const text = document.getElementById('commentText').value;
    if (!text) return;
    
    const postRef = db.collection('posts').doc(currentPostId);
    const postDoc = await postRef.get();
    const post = postDoc.data();
    const comments = post.comments || [];
    
    comments.push({ userId: currentUser.uid, text: text, createdAt: new Date() });
    await postRef.update({ comments: comments });
    
    document.getElementById('commentText').value = '';
    openCommentModal(currentPostId);
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

// ============ STORIES ============
function openStoryModal() {
    document.getElementById('storyModal').style.display = 'flex';
}

async function publishStory() {
    const text = document.getElementById('storyText').value;
    const imageFile = document.getElementById('storyImage').files[0];
    
    let imageUrl = null;
    if (imageFile) {
        try {
            const compressedBlob = await compressImage(imageFile, 500, 500);
            const storageRef = storage.ref(`stories/${Date.now()}_${imageFile.name}`);
            await storageRef.put(compressedBlob);
            imageUrl = await storageRef.getDownloadURL();
        } catch (error) {
            alert('Erreur lors de l\'upload');
            return;
        }
    }
    
    if (!text && !imageUrl) {
        alert('Ajoutez du texte ou une image');
        return;
    }
    
    await db.collection('stories').add({
        userId: currentUser.uid,
        text: text,
        imageUrl: imageUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    
    document.getElementById('storyText').value = '';
    document.getElementById('storyImage').value = '';
    document.getElementById('storyModal').style.display = 'none';
    loadStories();
}

async function loadStories() {
    const storiesSnapshot = await db.collection('stories')
        .where('expiresAt', '>', new Date())
        .orderBy('createdAt', 'desc')
        .get();
    
    const container = document.getElementById('storiesContainer');
    container.innerHTML = '';
    
    for (const doc of storiesSnapshot.docs) {
        const story = doc.data();
        const userDoc = await db.collection('users').doc(story.userId).get();
        const user = userDoc.data();
        
        const storyCard = document.createElement('div');
        storyCard.className = 'story-card';
        storyCard.onclick = () => viewStory(story);
        storyCard.innerHTML = `
            <div class="story-img">${story.imageUrl ? '📷' : '📝'}</div>
            <span>${user ? user.name : '?'}</span>
        `;
        container.appendChild(storyCard);
    }
}

function viewStory(story) {
    if (story.text) {
        alert(story.text);
    } else if (story.imageUrl) {
        openImageModal(story.imageUrl);
    } else {
        alert('Story vide');
    }
}

function closeStoryModal() {
    document.getElementById('storyModal').style.display = 'none';
}

// ============ RECHERCHE ============
async function searchUsers() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    const usersSnapshot = await db.collection('users').get();
    const results = [];
    
    usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.name.toLowerCase().includes(query) && doc.id !== currentUser.uid) {
            results.push({ id: doc.id, ...user });
        }
    });
    
    if (results.length > 0) {
        resultsDiv.innerHTML = results.map(user => {
            const avatarHtml = user.avatarUrl 
                ? `<img src="${user.avatarUrl}" class="user-avatar-img">`
                : `<div class="user-avatar">${user.avatar || '?'}</div>`;
            return `
                <div class="search-result-item" onclick="goToProfile('${user.id}')">
                    ${avatarHtml}
                    <span>${user.name}</span>
                </div>
            `;
        }).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

// ============ ABONNEMENTS ============
async function followUser(userId) {
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const following = userDoc.data().following || [];
    
    if (following.includes(userId)) {
        await userRef.update({ following: following.filter(id => id !== userId) });
        const targetRef = db.collection('users').doc(userId);
        const targetDoc = await targetRef.get();
        const followers = targetDoc.data().followers || [];
        await targetRef.update({ followers: followers.filter(id => id !== currentUser.uid) });
    } else {
        await userRef.update({ following: [...following, userId] });
        const targetRef = db.collection('users').doc(userId);
        const targetDoc = await targetRef.get();
        const followers = targetDoc.data().followers || [];
        await targetRef.update({ followers: [...followers, currentUser.uid] });
    }
    loadUserStats();
    loadSuggestedUsers();
}

async function loadUserStats() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    const followers = userData.followers || [];
    const following = userData.following || [];
    
    document.getElementById('followersCount').innerText = followers.length;
    document.getElementById('followingCount').innerText = following.length;
}

async function loadSuggestedUsers() {
    const usersSnapshot = await db.collection('users').limit(5).get();
    const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
    const following = currentUserDoc.data().following || [];
    
    const container = document.getElementById('suggestedUsers');
    container.innerHTML = '';
    
    for (const doc of usersSnapshot.docs) {
        if (doc.id === currentUser.uid) continue;
        const user = doc.data();
        const isFollowing = following.includes(doc.id);
        
        const avatarHtml = user.avatarUrl 
            ? `<img src="${user.avatarUrl}" class="user-avatar-img">`
            : `<div class="user-avatar">${user.avatar || '?'}</div>`;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'user-card';
        userDiv.innerHTML = `
            <div class="user-info" onclick="goToProfile('${doc.id}')" style="cursor:pointer">
                ${avatarHtml}
                <strong>${user.name}</strong>
            </div>
            <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="followUser('${doc.id}')">
                ${isFollowing ? 'Abonné' : 'S\'abonner'}
            </button>
        `;
        container.appendChild(userDiv);
    }
}

// ============ UTILITAIRES ============
function goToProfile(userId) {
    if (userId === currentUser.uid) {
        alert('C\'est votre profil !');
    } else {
        alert('Profil utilisateur - Fonctionnalité à venir');
    }
}

function openImageModal(imageUrl) {
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}

function sharePost(postId) {
    navigator.clipboard.writeText(window.location.href + '#post=' + postId);
    alert('Lien copié !');
}

function showFeed() {
    loadFeed();
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.menu-item').classList.add('active');
}

function showMyPosts() {
    alert('Mes publications - Fonctionnalité à venir');
}

function showUsers() {
    document.getElementById('feed').innerHTML = '<div class="post-card" style="padding:20px"><h3><i class="fas fa-users"></i> Tous les membres</h3><div id="allUsersList"></div></div>';
    loadAllUsers();
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.menu-item').classList.add('active');
}

async function loadAllUsers() {
    const usersSnapshot = await db.collection('users').get();
    const container = document.getElementById('allUsersList');
    container.innerHTML = '';
    
    for (const doc of usersSnapshot.docs) {
        if (doc.id === currentUser.uid) continue;
        const user = doc.data();
        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        const following = currentUserDoc.data().following || [];
        const isFollowing = following.includes(doc.id);
        
        const avatarHtml = user.avatarUrl 
            ? `<img src="${user.avatarUrl}" class="user-avatar-img">`
            : `<div class="user-avatar">${user.avatar || '?'}</div>`;
        
        const userDiv = document.createElement('div');
        userDiv.className = 'user-card';
        userDiv.style.padding = '12px';
        userDiv.innerHTML = `
            <div class="user-info" onclick="goToProfile('${doc.id}')" style="cursor:pointer">
                ${avatarHtml}
                <div>
                    <strong>${user.name}</strong>
                    <div style="font-size:12px; color:#65676b">${user.email}</div>
                </div>
            </div>
            <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="followUser('${doc.id}')">
                ${isFollowing ? 'Abonné' : 'S\'abonner'}
            </button>
        `;
        container.appendChild(userDiv);
    }
}