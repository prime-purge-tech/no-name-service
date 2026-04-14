// ============ FIREBASE CONFIG ============
const firebaseConfig = {
    apiKey: "AIzaSyBzCvdfEUUcBtryUqekRh91ZuHai4WG3vU",
    authDomain: "prime-purge-service.firebaseapp.com",
    projectId: "prime-purge-service",
    storageBucket: "prime-purge-service.firebasestorage.app",
    messagingSenderId: "181654423682",
    appId: "1:181654423682:web:c85e3e796fc2cff27c8c9b"
};

// Initialisation
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let currentUserData = null;
let currentPostId = null;
let currentShareLink = '';

const OWNER_EMAIL = "noahtoure8@gmail.com";

// ============ TOAST ============
function showToast(msg, duration = 2800) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

// ============ TEXTAREA AUTO-RESIZE ============
function autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

// ============ CERTIFICAT META ============
async function loadCertificate() {
    try {
        const certDoc = await db.collection('settings').doc('certificate').get();
        const certText = certDoc.exists ? certDoc.data().text : "Non certifié";
        document.getElementById('certificateText').innerText = "Certificat Meta : " + certText;
        document.getElementById('userCertificate').innerHTML = "✅ " + certText;

        if (currentUser && currentUser.email === OWNER_EMAIL) {
            document.getElementById('certificateContainer').style.display = 'block';
        } else {
            document.getElementById('certificateContainer').style.display = 'none';
        }
    } catch (e) {}
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
    const newCert = document.getElementById('certificateInput').value.trim();
    if (!newCert) return;
    await db.collection('settings').doc('certificate').set({ text: newCert });
    await loadCertificate();
    hideCertificateEdit();
    showToast('Certificat mis à jour !');
}

// ============ AUTHENTIFICATION ============
function showAuthMsg(msg, isError = true) {
    const el = document.getElementById('authMsg');
    el.className = isError ? 'error-msg' : 'success-msg';
    el.textContent = msg;
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('authMsg').textContent = '';
}

function showLogin() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('authMsg').textContent = '';
}

async function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showAuthMsg('Veuillez remplir tous les champs');
        return;
    }
    if (password.length < 6) {
        showAuthMsg('Le mot de passe doit faire 6 caractères minimum');
        return;
    }

    const btn = document.getElementById('registerBtn');
    btn.disabled = true;
    btn.textContent = 'Inscription...';

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({
            name, email,
            avatar: name.charAt(0).toUpperCase(),
            avatarUrl: null,
            followers: [],
            following: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAuthMsg('Compte créé avec succès ! Connexion...', false);
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/email-already-in-use') msg = 'Cet email est déjà utilisé.';
        showAuthMsg(msg);
        btn.disabled = false;
        btn.textContent = "S'inscrire";
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        showAuthMsg('Veuillez remplir tous les champs');
        return;
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Connexion...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        let msg = error.message;
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            msg = 'Email ou mot de passe incorrect.';
        }
        showAuthMsg(msg);
        btn.disabled = false;
        btn.textContent = 'Se connecter';
    }
}

async function logout() {
    await auth.signOut();
}

// ============ AUTH STATE ============
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            currentUserData = userDoc.data();
            if (!currentUserData) return;

            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('userName').innerText = currentUserData.name;
            document.getElementById('sidebarUserName').innerText = currentUserData.name;

            updateSidebarAvatar();
            updatePostFormAvatar();

            await loadCertificate();
            loadFeed();
            loadStories();
            loadUserStats();
            loadSuggestedUsers();
        } catch (e) {
            console.error(e);
        }
    } else {
        currentUser = null;
        currentUserData = null;
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginBtn').disabled = false;
        document.getElementById('loginBtn').textContent = 'Se connecter';
    }
});

function updateSidebarAvatar() {
    if (!currentUserData) return;
    const img = document.getElementById('profileAvatarImg');
    const placeholder = document.getElementById('profileAvatarPlaceholder');
    if (currentUserData.avatarUrl) {
        img.src = currentUserData.avatarUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholder.textContent = currentUserData.avatar || '?';
    }
}

function updatePostFormAvatar() {
    if (!currentUserData) return;
    const el = document.getElementById('postFormAvatar');
    if (currentUserData.avatarUrl) {
        el.innerHTML = `<img src="${currentUserData.avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
        el.textContent = currentUserData.avatar || '?';
    }
}

// ============ PHOTO DE PROFIL ============
async function openAvatarModal() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    document.getElementById('avatarPreview').src = userData.avatarUrl || '';
    document.getElementById('avatarModal').style.display = 'flex';
}

function closeAvatarModal() {
    document.getElementById('avatarModal').style.display = 'none';
}

function previewAvatar() {
    const file = document.getElementById('avatarInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => document.getElementById('avatarPreview').src = e.target.result;
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
                let w = img.width,
                    h = img.height;
                if (w > h) {
                    if (w > maxWidth) {
                        h *= maxWidth / w;
                        w = maxWidth;
                    }
                } else {
                    if (h > maxHeight) {
                        w *= maxHeight / h;
                        h = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(resolve, 'image/jpeg', 0.82);
            };
        };
    });
}

async function uploadAvatar() {
    const file = document.getElementById('avatarInput').files[0];
    if (!file) {
        showToast('Sélectionnez une image d\'abord');
        return;
    }
    try {
        const compressed = await compressImage(file, 500, 500);
        const ref = storage.ref(`avatars/${currentUser.uid}.jpg`);
        await ref.put(compressed);
        const url = await ref.getDownloadURL();
        await db.collection('users').doc(currentUser.uid).update({ avatarUrl: url });
        currentUserData.avatarUrl = url;
        updateSidebarAvatar();
        updatePostFormAvatar();
        closeAvatarModal();
        showToast('Photo de profil mise à jour !');
        loadFeed();
    } catch (e) {
        showToast('Erreur lors de l\'upload : ' + e.message);
    }
}

// ============ PUBLICATIONS ============
function previewPostImage() {
    const file = document.getElementById('postImage').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('postImagePreview').src = e.target.result;
            document.getElementById('postImagePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removePostImage() {
    document.getElementById('postImage').value = '';
    document.getElementById('postImagePreview').src = '';
    document.getElementById('postImagePreviewContainer').style.display = 'none';
}

async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('postImage').files[0];

    if (!content && !imageFile) {
        showToast('Écrivez quelque chose ou ajoutez une image');
        return;
    }

    const btn = document.getElementById('publishBtn');
    btn.disabled = true;
    btn.textContent = 'Publication...';

    let imageUrl = null;
    if (imageFile) {
        try {
            const compressed = await compressImage(imageFile, 1000, 1000);
            const ref = storage.ref(`posts/${currentUser.uid}_${Date.now()}.jpg`);
            await ref.put(compressed);
            imageUrl = await ref.getDownloadURL();
        } catch (e) {
            showToast('Erreur upload image : ' + e.message);
            btn.disabled = false;
            btn.textContent = 'Publier';
            return;
        }
    }

    try {
        await db.collection('posts').add({
            userId: currentUser.uid,
            content: content,
            imageUrl: imageUrl,
            likes: [],
            comments: [],
            shares: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('postContent').value = '';
        document.getElementById('postContent').style.height = 'auto';
        removePostImage();
        showToast('Publication créée !');
        loadFeed();
        loadUserStats();
    } catch (e) {
        showToast('Erreur lors de la publication : ' + e.message);
    }

    btn.disabled = false;
    btn.textContent = 'Publier';
}

// ============ FIL D'ACTUALITÉ ============
async function loadFeed() {
    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(40).get();

        if (postsSnapshot.empty) {
            feed.innerHTML = `<div class="empty-state"><i class="fas fa-newspaper"></i><p>Aucune publication pour l'instant.<br>Soyez le premier à publier !</p></div>`;
            return;
        }

        feed.innerHTML = '';

        for (const doc of postsSnapshot.docs) {
            const post = {
                id: doc.id,
                ...doc.data()
            };
            try {
                const userDoc = await db.collection('users').doc(post.userId).get();
                const user = userDoc.data();
                if (!user) continue;

                const isLiked = post.likes && post.likes.includes(currentUser.uid);
                const likesCount = post.likes ? post.likes.length : 0;
                const commentsCount = post.comments ? post.comments.length : 0;
                const sharesCount = post.shares || 0;

                const avatarHtml = user.avatarUrl ?
                    `<img src="${user.avatarUrl}" class="post-avatar-img" onclick="viewProfile('${post.userId}')">` :
                    `<div class="post-avatar" onclick="viewProfile('${post.userId}')">${user.avatar || '?'}</div>`;

                let timeStr = 'Récemment';
                if (post.createdAt) {
                    try {
                        const date = post.createdAt.toDate();
                        const diff = Date.now() - date.getTime();
                        if (diff < 60000) timeStr = 'À l\'instant';
                        else if (diff < 3600000) timeStr = `Il y a ${Math.floor(diff / 60000)} min`;
                        else if (diff < 86400000) timeStr = `Il y a ${Math.floor(diff / 3600000)} h`;
                        else timeStr = date.toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                    } catch (e) {}
                }

                const postDiv = document.createElement('div');
                postDiv.className = 'post-card';
                postDiv.id = `post-${post.id}`;
                postDiv.innerHTML = `
                    <div class="post-header">
                        ${avatarHtml}
                        <div class="post-info">
                            <h4 onclick="viewProfile('${post.userId}')">${escapeHtml(user.name)}</h4>
                            <span>${timeStr}</span>
                        </div>
                        ${post.userId === currentUser.uid ? `<button class="post-menu-btn" onclick="deletePost('${post.id}')"><i class="fas fa-trash-alt" style="color:#d93025;font-size:14px"></i></button>` : ''}
                    </div>
                    ${post.content ? `<div class="post-text">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>` : ''}
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onclick="openImageModal('${post.imageUrl}')">` : ''}
                    <div class="post-stats">
                        <span>${likesCount > 0 ? `👍 ${likesCount} j'aime` : ''}</span>
                        <span>${commentsCount > 0 ? `${commentsCount} commentaire${commentsCount > 1 ? 's' : ''}` : ''} ${sharesCount > 0 ? `· ${sharesCount} partage${sharesCount > 1 ? 's' : ''}` : ''}</span>
                    </div>
                    <div class="post-actions">
                        <div class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                            <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up"></i> J'aime
                        </div>
                        <div class="post-action-btn" onclick="openCommentModal('${post.id}')">
                            <i class="far fa-comment"></i> Commenter
                        </div>
                        <div class="post-action-btn" onclick="sharePost('${post.id}')">
                            <i class="fas fa-share"></i> Partager
                        </div>
                    </div>
                `;
                feed.appendChild(postDiv);
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        feed.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Erreur de chargement. Vérifiez votre connexion.</p></div>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============ LIKE ============
async function toggleLike(postId, btnEl) {
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    const post = postDoc.data();
    const likes = post.likes || [];
    const isLiked = likes.includes(currentUser.uid);

    if (isLiked) {
        await postRef.update({
            likes: likes.filter(id => id !== currentUser.uid)
        });
    } else {
        await postRef.update({
            likes: [...likes, currentUser.uid]
        });
    }
    loadFeed();
}

// ============ DELETE POST ============
async function deletePost(postId) {
    if (!confirm('Supprimer cette publication ?')) return;
    try {
        await db.collection('posts').doc(postId).delete();
        showToast('Publication supprimée');
        loadFeed();
        loadUserStats();
    } catch (e) {
        showToast('Erreur : ' + e.message);
    }
}

// ============ COMMENTAIRES ============
async function openCommentModal(postId) {
    currentPostId = postId;
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    document.getElementById('commentModal').style.display = 'flex';

    try {
        const postDoc = await db.collection('posts').doc(postId).get();
        const post = postDoc.data();
        const comments = post.comments || [];

        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="empty-state" style="padding:20px"><p>Aucun commentaire. Soyez le premier !</p></div>';
        } else {
            for (const comment of comments) {
                try {
                    const userDoc = await db.collection('users').doc(comment.userId).get();
                    const user = userDoc.data();
                    const avatarHtml = user && user.avatarUrl ?
                        `<img src="${user.avatarUrl}" class="comment-avatar-img">` :
                        `<div class="comment-avatar">${user ? user.avatar : '?'}</div>`;

                    const div = document.createElement('div');
                    div.className = 'comment-item';
                    div.innerHTML = `
                        ${avatarHtml}
                        <div style="flex:1">
                            <div class="comment-bubble">
                                <div class="comment-name">${escapeHtml(user ? user.name : 'Inconnu')}</div>
                                <div class="comment-content">${escapeHtml(comment.text)}</div>
                            </div>
                            ${comment.createdAt ? `<div class="comment-time">${new Date(comment.createdAt.toDate ? comment.createdAt.toDate() : comment.createdAt).toLocaleString('fr-FR')}</div>` : ''}
                        </div>
                    `;
                    commentsList.appendChild(div);
                } catch (e) {
                    continue;
                }
            }
        }
    } catch (e) {
        commentsList.innerHTML = '<p style="color:red;padding:10px">Erreur de chargement.</p>';
    }
}

async function addComment() {
    const text = document.getElementById('commentText').value.trim();
    if (!text) return;

    try {
        const postRef = db.collection('posts').doc(currentPostId);
        const postDoc = await postRef.get();
        const comments = postDoc.data().comments || [];
        comments.push({
            userId: currentUser.uid,
            text,
            createdAt: new Date()
        });
        await postRef.update({
            comments
        });
        document.getElementById('commentText').value = '';
        openCommentModal(currentPostId);
        loadFeed();
    } catch (e) {
        showToast('Erreur : ' + e.message);
    }
}

function closeCommentModal() {
    document.getElementById('commentModal').style.display = 'none';
}

// ============ PARTAGE ============
function sharePost(postId) {
    const link = window.location.href.split('?')[0] + '?post=' + postId;
    currentShareLink = link;
    document.getElementById('shareLinkBox').textContent = link;
    document.getElementById('shareModal').style.display = 'flex';

    db.collection('posts').doc(postId).update({
        shares: firebase.firestore.FieldValue.increment(1)
    }).then(() => loadFeed()).catch(() => {});
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

function copyShareLink() {
    navigator.clipboard.writeText(currentShareLink).then(() => {
        showToast('Lien copié dans le presse-papier !');
        closeShareModal();
    }).catch(() => {
        showToast('Lien : ' + currentShareLink);
    });
}

// ============ STORIES ============
function openStoryModal() {
    document.getElementById('storyModal').style.display = 'flex';
}

function closeStoryModal() {
    document.getElementById('storyModal').style.display = 'none';
}

async function publishStory() {
    const text = document.getElementById('storyText').value.trim();
    const imageFile = document.getElementById('storyImage').files[0];

    if (!text && !imageFile) {
        showToast('Ajoutez du texte ou une image');
        return;
    }

    let imageUrl = null;
    if (imageFile) {
        try {
            const compressed = await compressImage(imageFile, 600, 600);
            const ref = storage.ref(`stories/${currentUser.uid}_${Date.now()}.jpg`);
            await ref.put(compressed);
            imageUrl = await ref.getDownloadURL();
        } catch (e) {
            showToast('Erreur upload');
            return;
        }
    }

    await db.collection('stories').add({
        userId: currentUser.uid,
        text,
        imageUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    document.getElementById('storyText').value = '';
    document.getElementById('storyImage').value = '';
    closeStoryModal();
    showToast('Story publiée ! (visible 24h)');
    loadStories();
}

async function loadStories() {
    try {
        const snap = await db.collection('stories').where('expiresAt', '>', new Date()).orderBy('expiresAt', 'desc').get();
        const container = document.getElementById('storiesContainer');
        container.innerHTML = `<div class="story-card create" onclick="openStoryModal()"><div class="story-img">➕</div><span>Story</span></div>`;

        for (const doc of snap.docs) {
            const story = doc.data();
            try {
                const userDoc = await db.collection('users').doc(story.userId).get();
                const user = userDoc.data();
                const card = document.createElement('div');
                card.className = 'story-card';
                card.onclick = () => viewStory(story);

                const avatarHtml = user && user.avatarUrl ?
                    `<img src="${user.avatarUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #1877f2">` :
                    `<div style="font-size:28px">${story.imageUrl ? '📷' : '📝'}</div>`;

                card.innerHTML = `${avatarHtml}<span>${user ? user.name.split(' ')[0] : '?'}</span>`;
                container.appendChild(card);
            } catch (e) {
                continue;
            }
        }
    } catch (e) {}
}

function viewStory(story) {
    if (story.imageUrl) {
        openImageModal(story.imageUrl);
    } else if (story.text) {
        alert('📝 ' + story.text);
    }
}

// ============ RECHERCHE ============
let searchTimeout;

async function searchUsers() {
    clearTimeout(searchTimeout);
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('searchResults');

    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const snap = await db.collection('users').get();
            const results = [];
            snap.forEach(doc => {
                const user = doc.data();
                if (user.name.toLowerCase().includes(query) && doc.id !== currentUser.uid) {
                    results.push({
                        id: doc.id,
                        ...user
                    });
                }
            });

            if (results.length > 0) {
                resultsDiv.innerHTML = results.slice(0, 8).map(user => {
                    const avatarHtml = user.avatarUrl ?
                        `<img src="${user.avatarUrl}" class="user-avatar-img">` :
                        `<div class="user-avatar">${user.avatar || '?'}</div>`;
                    return `<div class="search-result-item" onclick="viewProfile('${user.id}')">
                        ${avatarHtml}
                        <span>${escapeHtml(user.name)}</span>
                    </div>`;
                }).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.innerHTML = '<div style="padding:12px;color:#65676b;font-size:13px">Aucun résultat</div>';
                resultsDiv.style.display = 'block';
            }
        } catch (e) {}
    }, 300);
}

document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) {
        document.getElementById('searchResults').style.display = 'none';
    }
});

// ============ ABONNEMENTS ============
async function followUser(userId, btnEl) {
    if (!currentUser) return;
    try {
        const userRef = db.collection('users').doc(currentUser.uid);
        const userDoc = await userRef.get();
        const following = userDoc.data().following || [];
        const isFollowing = following.includes(userId);

        if (isFollowing) {
            await userRef.update({
                following: following.filter(id => id !== userId)
            });
            await db.collection('users').doc(userId).update({
                followers: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
            });
            if (btnEl) {
                btnEl.textContent = "S'abonner";
                btnEl.className = 'follow-btn';
            }
            showToast('Désabonné');
        } else {
            await userRef.update({
                following: [...following, userId]
            });
            await db.collection('users').doc(userId).update({
                followers: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
            });
            if (btnEl) {
                btnEl.textContent = 'Abonné ✓';
                btnEl.className = 'follow-btn following';
            }
            showToast('Abonné !');
        }
        loadUserStats();
        loadSuggestedUsers();
        currentUserData = (await db.collection('users').doc(currentUser.uid).get()).data();
    } catch (e) {
        showToast('Erreur : ' + e.message);
    }
}

async function loadUserStats() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        document.getElementById('followersCount').innerText = (userData.followers || []).length;
        document.getElementById('followingCount').innerText = (userData.following || []).length;

        const postsSnap = await db.collection('posts').where('userId', '==', currentUser.uid).get();
        document.getElementById('postsCount').innerText = postsSnap.size;
    } catch (e) {}
}

async function loadSuggestedUsers() {
    try {
        const snap = await db.collection('users').limit(10).get();
        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        const following = currentUserDoc.data().following || [];
        const container = document.getElementById('suggestedUsers');
        container.innerHTML = '';
        let count = 0;

        for (const doc of snap.docs) {
            if (doc.id === currentUser.uid || count >= 5) continue;
            const user = doc.data();
            const isFollowing = following.includes(doc.id);
            const avatarHtml = user.avatarUrl ?
                `<img src="${user.avatarUrl}" class="user-avatar-img">` :
                `<div class="user-avatar">${user.avatar || '?'}</div>`;

            const div = document.createElement('div');
            div.className = 'user-card';
            div.innerHTML = `
                <div class="user-info" onclick="viewProfile('${doc.id}')" style="cursor:pointer">
                    ${avatarHtml}
                    <div class="user-info-text">
                        <strong>${escapeHtml(user.name)}</strong>
                        <span>${(user.followers || []).length} abonnés</span>
                    </div>
                </div>
                <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="followUser('${doc.id}', this)">
                    ${isFollowing ? 'Abonné ✓' : "S'abonner"}
                </button>
            `;
            container.appendChild(div);
            count++;
        }
    } catch (e) {}
}

// ============ NAVIGATION ============
function showFeed(menuItem) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (menuItem) menuItem.classList.add('active');

    document.getElementById('postFormContainer').style.display = 'block';
    loadFeed();
    loadStories();
}

async function showMyPosts(menuItem) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (menuItem) menuItem.classList.add('active');

    document.getElementById('postFormContainer').style.display = 'block';
    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        const snap = await db.collection('posts').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();

        if (snap.empty) {
            feed.innerHTML = `<div class="empty-state"><i class="fas fa-pen-square"></i><p>Vous n'avez pas encore publié.<br>Partagez quelque chose !</p></div>`;
            return;
        }

        feed.innerHTML = '';
        for (const doc of snap.docs) {
            const post = {
                id: doc.id,
                ...doc.data()
            };
            const isLiked = post.likes && post.likes.includes(currentUser.uid);
            const user = currentUserData;

            const avatarHtml = user.avatarUrl ?
                `<img src="${user.avatarUrl}" class="post-avatar-img">` :
                `<div class="post-avatar">${user.avatar || '?'}</div>`;

            let timeStr = 'Récemment';
            if (post.createdAt) {
                try {
                    timeStr = post.createdAt.toDate().toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    });
                } catch (e) {}
            }

            const div = document.createElement('div');
            div.className = 'post-card';
            div.innerHTML = `
                <div class="post-header">
                    ${avatarHtml}
                    <div class="post-info">
                        <h4>${escapeHtml(user.name)}</h4>
                        <span>${timeStr}</span>
                    </div>
                    <button class="post-menu-btn" onclick="deletePost('${post.id}')"><i class="fas fa-trash-alt" style="color:#d93025;font-size:14px"></i></button>
                </div>
                ${post.content ? `<div class="post-text">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>` : ''}
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onclick="openImageModal('${post.imageUrl}')">` : ''}
                <div class="post-stats">
                    <span>${(post.likes || []).length > 0 ? `👍 ${(post.likes || []).length}` : ''}</span>
                    <span>${(post.comments || []).length > 0 ? `${(post.comments || []).length} commentaire(s)` : ''}</span>
                </div>
                <div class="post-actions">
                    <div class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                        <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up"></i> J'aime
                    </div>
                    <div class="post-action-btn" onclick="openCommentModal('${post.id}')">
                        <i class="far fa-comment"></i> Commenter
                    </div>
                    <div class="post-action-btn" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share"></i> Partager
                    </div>
                </div>
            `;
            feed.appendChild(div);
        }
    } catch (e) {
        feed.innerHTML = `<div class="empty-state"><p>Erreur de chargement.</p></div>`;
    }
}

async function showUsers(menuItem) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    if (menuItem) menuItem.classList.add('active');

    document.getElementById('postFormContainer').style.display = 'none';
    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement...</p></div>';

    try {
        const snap = await db.collection('users').get();
        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        const following = currentUserDoc.data().following || [];

        feed.innerHTML = `<div class="post-card" style="padding:16px"><h3 style="margin-bottom:14px"><i class="fas fa-users" style="color:#1877f2"></i> Tous les membres</h3><div id="allUsersList"></div></div>`;
        const container = document.getElementById('allUsersList');

        for (const doc of snap.docs) {
            if (doc.id === currentUser.uid) continue;
            const user = doc.data();
            const isFollowing = following.includes(doc.id);
            const avatarHtml = user.avatarUrl ?
                `<img src="${user.avatarUrl}" class="user-avatar-img" style="width:44px;height:44px">` :
                `<div class="user-avatar" style="width:44px;height:44px;font-size:16px">${user.avatar || '?'}</div>`;

            const div = document.createElement('div');
            div.className = 'user-card';
            div.style.padding = '10px 0';
            div.innerHTML = `
                <div class="user-info" onclick="viewProfile('${doc.id}')" style="cursor:pointer">
                    ${avatarHtml}
                    <div class="user-info-text">
                        <strong>${escapeHtml(user.name)}</strong>
                        <span>${(user.followers || []).length} abonnés · ${(user.following || []).length} abonnements</span>
                    </div>
                </div>
                <button class="follow-btn ${isFollowing ? 'following' : ''}" onclick="followUser('${doc.id}', this)">
                    ${isFollowing ? 'Abonné ✓' : "S'abonner"}
                </button>
            `;
            container.appendChild(div);
        }
    } catch (e) {
        feed.innerHTML = `<div class="empty-state"><p>Erreur de chargement.</p></div>`;
    }
}

// ============ PROFIL UTILISATEUR ============
async function viewProfile(userId) {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('searchInput').value = '';

    if (userId === currentUser.uid) {
        showToast('C\'est votre profil !');
        return;
    }

    const feed = document.getElementById('feed');
    feed.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement du profil...</p></div>';
    document.getElementById('postFormContainer').style.display = 'none';
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const user = userDoc.data();
        if (!user) return;

        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        const following = currentUserDoc.data().following || [];
        const isFollowing = following.includes(userId);

        const postsSnap = await db.collection('posts').where('userId', '==', userId).orderBy('createdAt', 'desc').get();

        const avatarHtml = user.avatarUrl ?
            `<img src="${user.avatarUrl}" class="profile-page-avatar" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:4px solid white">` :
            `<div class="profile-page-avatar-placeholder" style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#1877f2,#0e5a9e);display:flex;align-items:center;justify-content:center;font-size:36px;color:white;font-weight:bold;border:4px solid white">${user.avatar || '?'}</div>`;

        let postsHtml = '';
        for (const doc of postsSnap.docs) {
            const post = {
                id: doc.id,
                ...doc.data()
            };
            const isLiked = post.likes && post.likes.includes(currentUser.uid);
            let timeStr = 'Récemment';
            if (post.createdAt) {
                try {
                    timeStr = post.createdAt.toDate().toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long'
                    });
                } catch (e) {}
            }
            postsHtml += `
                <div class="post-card" style="margin-bottom:12px">
                    <div class="post-header">
                        ${user.avatarUrl ? `<img src="${user.avatarUrl}" class="post-avatar-img">` : `<div class="post-avatar">${user.avatar || '?'}</div>`}
                        <div class="post-info"><h4>${escapeHtml(user.name)}</h4><span>${timeStr}</span></div>
                    </div>
                    ${post.content ? `<div class="post-text">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>` : ''}
                    ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" onclick="openImageModal('${post.imageUrl}')">` : ''}
                    <div class="post-actions">
                        <div class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', this)">
                            <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up"></i> J'aime (${(post.likes || []).length})
                        </div>
                        <div class="post-action-btn" onclick="openCommentModal('${post.id}')">
                            <i class="far fa-comment"></i> Commenter
                        </div>
                        <div class="post-action-btn" onclick="sharePost('${post.id}')">
                            <i class="fas fa-share"></i> Partager
                        </div>
                    </div>
                </div>
            `;
        }

        feed.innerHTML = `
            <div style="background:white;border-radius:12px;overflow:hidden;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
                <div style="height:160px;background:linear-gradient(135deg,#1877f2,#0e5a9e);position:relative"></div>
                <div style="padding:0 20px 20px;margin-top:-48px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-end">
                        ${avatarHtml}
                        <button class="follow-btn ${isFollowing ? 'following' : ''}" id="profileFollowBtn" onclick="followUser('${userId}', document.getElementById('profileFollowBtn'))" style="padding:8px 18px;font-size:14px">
                            ${isFollowing ? '✓ Abonné' : "+ S'abonner"}
                        </button>
                    </div>
                    <div style="margin-top:8px">
                        <div style="font-size:22px;font-weight:800">${escapeHtml(user.name)}</div>
                        <div style="font-size:13px;color:#65676b;margin-top:4px">Purgeur & Expert</div>
                        <div style="display:flex;gap:20px;margin-top:12px">
                            <div style="text-align:center"><strong style="font-size:18px">${(user.followers || []).length}</strong><div style="font-size:12px;color:#65676b">abonnés</div></div>
                            <div style="text-align:center"><strong style="font-size:18px">${(user.following || []).length}</strong><div style="font-size:12px;color:#65676b">abonnements</div></div>
                            <div style="text-align:center"><strong style="font-size:18px">${postsSnap.size}</strong><div style="font-size:12px;color:#65676b">publications</div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="border-bottom:2px solid #1877f2;padding-bottom:8px;margin-bottom:16px;font-weight:700;color:#1877f2">
                <i class="fas fa-newspaper"></i> Publications
            </div>
            ${postsSnap.empty ? '<div class="empty-state"><i class="fas fa-pen-square"></i><p>Aucune publication</p></div>' : postsHtml}
            <div style="text-align:center;margin-top:10px">
                <button onclick="showFeed()" style="background:none;border:1px solid #1877f2;color:#1877f2;padding:8px 18px;border-radius:8px;cursor:pointer;font-weight:600">
                    ← Retour au fil
                </button>
            </div>
        `;
    } catch (e) {
        feed.innerHTML = `<div class="empty-state"><p>Erreur de chargement du profil.</p></div>`;
    }
}

// ============ UTILITAIRES ============
function openImageModal(url) {
    document.getElementById('modalImage').src = url;
    document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
}