'use strict';

///////////////////////////////////   INIT   ///////////////////////////////////

const body = document.querySelector('body');
const app = body.querySelector('.app');
const menu = app.querySelector('.menu');
const drag = menu.querySelector('.drag');
const burger = menu.querySelector('.burger');
const newMode = menu.querySelector('.mode');
const comments = menu.querySelector('.comments');
const commentsTools = menu.querySelector('.comments-tools');
const menuToggle = commentsTools.querySelectorAll('.menu__toggle');
const draw = menu.querySelector('.draw');
const drawTools = menu.querySelector('.draw-tools');
const share = menu.querySelector('.share');
const shareTools = menu.querySelector('.share-tools');
const currentImage = app.querySelector('.current-image');
const commentsForm = app.querySelector('.comments__form');
const commentMain = commentsForm.querySelector('.comment');
const error = app.querySelector('.error');
const errorHeader = error.querySelector('.error__header');
const errorMessage = error.querySelector('.error__message');
const modeElements = menu.querySelectorAll('.mode');
const toolsElements = menu.querySelectorAll('.tool');
const menuColor = menu.querySelectorAll('.menu__color');
const menuUrl = menu.querySelector('.menu__url');
const menuCopy = menu.querySelector('.menu_copy');
const imageLoader = app.querySelector('.image-loader');
const canvas = document.querySelector('canvas');
let connection;
const ctx = canvas.getContext('2d');
let divMask = document.querySelector('.div-mask');
let imgId;
let showComments = {};
let moveMenu = false;
let minY, minX, maxX, maxY;
let shiftX = 0;
let shiftY = 0;
let checkImg = false;
let imgStyle;
let isMouseDown = false;
let needUpdate = true;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
let currentColor = '#6cbe47';
app.removeChild(commentsForm);

function resizeCanvasAndMask() {
    imgStyle = getComputedStyle(currentImage);
    canvas.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    canvas.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    canvas.width = parseInt(imgStyle.width);
    canvas.height = parseInt(imgStyle.height);
    divMask.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    divMask.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    divMask.style.width = parseInt(imgStyle.width) + 'px';
    divMask.style.height = parseInt(imgStyle.height) + 'px';
};

window.addEventListener('resize', () => {
    canvas.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    canvas.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    divMask.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    divMask.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
});

function beforeLoadImg() {
    resizeCanvasAndMask();
    checkImg = false;
    menu.dataset.state = 'selected';
    share.dataset.state = 'selected';
    shareTools.classList.remove('tool');
    document.querySelectorAll('.comments__form').forEach(comment => { comment.remove() });
    wss();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.background = '';
};

// fix trouble --close an empty comment form when clicking outside of canvas //

function clickOutsideCanvas() {
    document.querySelectorAll('.comments__form').forEach(form => {
        if (form.dataset.hasComments === 'false') {
            form.remove();
        };
        form.querySelector('.comments__marker-checkbox').checked = false;
    });
};

menu.addEventListener('click', () => {
    clickOutsideCanvas();
});

app.addEventListener('click', (event) => {
    if (event.target == app) {
        clickOutsideCanvas()
    };
});

////////////////////////////   DRAG AND DROP   /////////////////////////////////

drag.addEventListener('mousedown', (event) => {
    minY = app.offsetTop;
    minX = app.offsetLeft;
    maxX = app.offsetLeft + app.offsetWidth - menu.offsetWidth - 1;
    maxY = app.offsetTop + app.offsetHeight - menu.offsetHeight;
    shiftX = event.pageX - event.target.getBoundingClientRect().left - window.pageXOffset;
    shiftY = event.pageY - event.target.getBoundingClientRect().top - window.pageYOffset;
    moveMenu = function(x, y) {
        x = x - shiftX;
        y = y - shiftY;
        x = Math.min(x, maxX);
        y = Math.min(y, maxY);
        x = Math.max(x, minX);
        y = Math.max(y, minY);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    };

    function move(event) {
        moveMenu(event.pageX, event.pageY);
    };

    document.addEventListener('mousemove', move);

    document.addEventListener('mouseup', () => {
        moveMenu = false;
        document.removeEventListener('mousemove', move);
    });
});

drag.addEventListener('dragstart', () => {
    return false;
});

////////////////////////////   BURGER AND MENU  ////////////////////////////////

menu.dataset.state = 'initial';
burger.addEventListener('click', () => {
    menu.dataset.state = 'default';
    modeElements.forEach(el => el.dataset.state = '');
    toolsElements.forEach(el => el.classList.add('tool'));
    canvas.style.cursor = 'default';
    canvas.removeEventListener('click', addCommentEvent);
    canvas.removeEventListener('mousemove', circle);
});

//////////////////////////////   ADD FILE   ////////////////////////////////////

function showError(text) {
    error.classList.remove('invisible');
    errorMessage.innerText = text;
    setTimeout(() => {
        error.classList.add('invisible');
    }, 4000)
}

currentImage.addEventListener('error', () => {
    checkImg = true;
});

currentImage.addEventListener('load', beforeLoadImg);

if (sessionStorage.getItem('imgId')) {
    imgId = sessionStorage.getItem('imgId');
    currentImage.src = sessionStorage.getItem('imgUrl');
    menuUrl.value = sessionStorage.getItem('imgSharedLink');
};

function showFile(file) {
    if (!(file.type === 'image/jpeg' || file.type === 'image/png')) {
        return showError('Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.');
    }
    let formData = new FormData();
    formData.append('title', file.name);
    formData.append('image', file);
    let xhr = new XMLHttpRequest();
    xhr.addEventListener('loadstart', () => {
        imageLoader.classList.remove('invisible');
    });
    xhr.addEventListener('loadend', () => {
        imageLoader.classList.add('invisible');
    });
    xhr.open('POST', 'https://neto-api.herokuapp.com/pic', true);
    xhr.addEventListener('load', () => {
        if (xhr.status == 200) {
            let imgData = JSON.parse(xhr.responseText);
            imgId = imgData.id;
            currentImage.src = imgData.url;
            menuUrl.value = `${window.location.origin}${window.location.pathname}?id=${imgData.id}`;
            sessionStorage.setItem('imgId', imgData.id);
            sessionStorage.setItem('imgUrl', imgData.url);
            sessionStorage.setItem('imgSharedLink', `${window.location.origin}${window.location.pathname}?id=${imgData.id}`);
            if (window.location.search) {
                document.location.href = `${window.location.origin}${window.location.pathname}?id=${imgData.id}`;
            };
        };
    });
    xhr.send(formData);
};

app.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!checkImg) {
        return showError('Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом «Загрузить новое» в меню');
    }
    let file = event.dataTransfer.files[0];
    showFile(file);
});

app.addEventListener('dragover', (event) => {
    event.preventDefault();
});

let inputFile = document.querySelector('.hidden-input');
inputFile.addEventListener('change', (event) => {
    let file = event.target.files[0];
    showFile(file);
});

////////////////////////////////   DRAW   //////////////////////////////////////

draw.addEventListener('click', () => {
    menu.dataset.state = 'selected';
    draw.dataset.state = 'selected';
    drawTools.classList.remove('tool');
    canvas.removeEventListener('click', addCommentEvent);
    canvas.style.cursor = 'url(./i/edit.png), sw-resize';

    canvas.addEventListener('mousedown', () => {
        isMouseDown = true;
        ctx.beginPath();
    });
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    canvas.addEventListener('mouseout', () => {
        isMouseDown = false;
    });
    canvas.addEventListener('mousemove', circle);

    menuColor.forEach((colorItem) => {
        colorItem.addEventListener('change', (event) => {
            currentColor = event.target.dataset.hex;
        });
    });
});

function circle(event) {
    if (!isMouseDown) {
        return false;
    };
    const point = [event.layerX, event.layerY];
    ctx.fillStyle = currentColor;
    ctx.lineWidth = 4;
    ctx.strokeStyle = currentColor;
    ctx.lineTo(...point);
    ctx.stroke();
    ctx.arc(...point, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(...point);
    trottledSendMask();
};

const trottledSendMask = throttleCanvas(sendMaskState, 1000);

function sendMaskState() {
    canvas.toBlob(function(blob) {
        connection.send(blob);
    });
};

function throttleCanvas(callback, delay) {
    let isWaiting = false;
    return function() {
        if (!isWaiting) {
            isWaiting = true;
            setTimeout(() => {
                callback();
                isWaiting = false;
            }, delay);
        };
    };
};

//////////////////////////////   COMMENTS   ////////////////////////////////////

comments.addEventListener('click', () => {
    menu.dataset.state = 'selected';
    comments.dataset.state = 'selected';
    commentsTools.classList.remove('tool');
    canvas.style.cursor = 'default';
    canvas.addEventListener('click', addCommentEvent);
    canvas.removeEventListener('mousemove', circle);
});

function addCommentEvent(event) {
    event.preventDefault();

    function addCommentForm(event) {
        document.querySelectorAll('.comments__marker-checkbox').forEach(marker => {
            marker.checked = false;
        });
        document.querySelectorAll('.comments__close').forEach(closeButton => {
            closeButton.disabled = false;
        });
        document.querySelectorAll('.comments__form').forEach(form => {
            if (form.dataset.hasComments === 'false') {
                form.remove();
            };
        });
        if (menuToggle[0].checked === true) {
            let left = event.layerX - 21;
            let top = event.layerY - 14;
            let newForm = createCommentForm(left, top);
            divMask.appendChild(newForm);
        };
    };
    addCommentForm(event);
};

function addMessage(message, timeStamp) {
    let date = new Date(timeStamp);
    let comment = commentMain.cloneNode(true);
    let commentTime = comment.querySelector('.comment__time');
    commentTime.innerText = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    let commentMessage = comment.querySelector('.comment__message');
    commentMessage.innerText = message;
    return comment;
};

function createCommentForm(left, top) {
    let newCommentForm = commentsForm.cloneNode(true);
    let commentBody = newCommentForm.querySelector('.comments__body')
    let commentTemplate = newCommentForm.querySelector('.comment');
    commentBody.removeChild(commentTemplate);
    let commentMarkerCheckbox = newCommentForm.querySelector('.comments__marker-checkbox');
    commentMarkerCheckbox.checked = true;
    let commentsLoader = newCommentForm.querySelector('.comment .loader');
    commentsLoader.classList.add('invisible');
    let commentClose = newCommentForm.querySelector('.comments__close');
    commentClose.disabled = true;
    let commentSubmit = newCommentForm.querySelector('.comments__submit');
    let commentInput = newCommentForm.querySelector('.comments__input');
    newCommentForm.style.top = top + 'px';
    newCommentForm.style.left = left + 'px';
    newCommentForm.style.zIndex = '3';
    newCommentForm.dataset.left = left;
    newCommentForm.dataset.top = top;
    newCommentForm.dataset.hasComments = 'false';
    commentMarkerCheckbox.addEventListener('click', (event) => {
        document.querySelectorAll('.comments__form').forEach(form => {
            if (form.dataset.hasComments === 'false') {
                form.remove();
            }
            form.style.zIndex = '2';
        });
        if (event.target.checked === true) {
            document.querySelectorAll('.comments__marker-checkbox').forEach(marker => {
                marker.checked = false;
                event.target.checked = true;
                event.target.parentElement.style.zIndex = '3';
            });
        } else {
            event.target.checked = false;
            event.target.parentElement.style.zIndex = '2';
        };
    });

    commentClose.addEventListener('click', (event) => {
        event.preventDefault();
        commentMarkerCheckbox.checked = false;
    });

    commentSubmit.addEventListener('click', (event) => {
        event.preventDefault();
        let xhr = new XMLHttpRequest();
        xhr.open('post', `https://neto-api.herokuapp.com/pic/${imgId}/comments`, true);
        let app = `message=${encodeURIComponent(commentInput.value)}&left=${encodeURIComponent(left)}&top=${encodeURIComponent(top)}`;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.addEventListener('loadstart', () => {
            commentsLoader.classList.remove('invisible');
        });
        xhr.addEventListener('loadend', () => {
            commentsLoader.classList.add('invisible');
        });
        xhr.send(app);
    });
    return newCommentForm;
};

menuToggle.forEach((toggle) => {
    toggle.addEventListener('change', (event) => {
        if (event.target.value === 'on') {
            document.querySelectorAll('.comments__form').forEach(form => { form.classList.remove('invisible') });
        };
        if (event.target.value === 'off') {
            document.querySelectorAll('.comments__form').forEach(form => { form.classList.add('invisible') });
        }
    });
});

////////////////////////////////   SHARE   /////////////////////////////////////

share.addEventListener('click', () => {
    menu.dataset.state = 'selected';
    share.dataset.state = 'selected';
    shareTools.classList.remove('tool');
    canvas.style.cursor = 'default';
    canvas.removeEventListener('click', addCommentEvent);
    canvas.removeEventListener('mousemove', circle);
});
menuCopy.addEventListener('click', (event) => {
    event.preventDefault();
    menuUrl.select();
    document.execCommand('copy');
});
////////////////////////////   FOLLOWING A LINK   //////////////////////////////

if (window.location.search) {
    menu.classList.add('invisible');
    imageLoader.classList.remove('invisible');
    imgId = window.location.href.split('?id=')[1];
    let xhr = new XMLHttpRequest();
    xhr.open('get', `https://neto-api.herokuapp.com/pic/${imgId}`, true);
    xhr.send();
    xhr.addEventListener('load', () => {
        wss();
        menu.classList.remove('invisible');
        imageLoader.classList.add('invisible');
        let getData = JSON.parse(xhr.responseText);
        currentImage.src = getData.url;
        menuUrl.value = window.location.href;
        menu.dataset.state = 'selected';
        comments.dataset.state = 'selected';
        commentsTools.classList.remove('tool');
        currentImage.addEventListener('load', () => {
            resizeCanvasAndMask();
            checkImg = false;
            menu.dataset.state = 'selected';
            modeElements.forEach(el => el.dataset.state = '');
            toolsElements.forEach(el => el.classList.add('tool'));
            comments.dataset.state = 'selected';
            commentsTools.classList.remove('tool');
            canvas.addEventListener('click', addCommentEvent);
            let parseComments = getData.comments;
            for (let key in parseComments) {
                let comment = parseComments[key];
                let parseForm;
                if (divMask.querySelector(`form[data-left="${comment.left}"][data-top="${comment.top}"]`) != null) {
                    parseForm = document.querySelector(`form[data-left="${comment.left}"][data-top="${comment.top}"]`);
                } else {
                    parseForm = createCommentForm(comment.left, comment.top);
                    divMask.appendChild(parseForm);
                };
                let parseComment = addMessage(comment.message, comment.timestamp);
                parseComment.dataset.commentId = key;
                let commentBody = parseForm.querySelector('.comments__body');
                let commentsLoader = parseForm.querySelector('.comment .loader').parentNode;
                commentBody.insertBefore(parseComment, commentsLoader);
                let commentMarkerCheckbox = parseForm.querySelector('.comments__marker-checkbox');
                commentMarkerCheckbox.classList.remove('invisible');
                commentMarkerCheckbox.checked = false;
                let commentClose = parseForm.querySelector('.comments__close');
                commentClose.disabled = false;
                parseForm.dataset.hasComments = 'true';
            };
        });
    });
};

function wss() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imgId}`);
    connection.addEventListener('message', event => {
        console.log(JSON.parse(event.data));
        if (JSON.parse(event.data).event === 'pic') {
            if (JSON.parse(event.data).pic.mask) {
                canvas.style.background = `url(${JSON.parse(event.data).pic.mask})`;
            };
        };
        if (JSON.parse(event.data).event === 'comment') {
            insertWssCommentForm(JSON.parse(event.data).comment);

        };
        if (JSON.parse(event.data).event === 'mask') {
            canvas.style.background = `url(${JSON.parse(event.data).url})`;
        };

        if (JSON.parse(event.data).event === 'error') {
            console.log(JSON.parse(event.data).message);
        };
    });
};

window.onbeforeunload = function() {
    connection.onclose = function() {};
    connection.close();
};

function updateCommentForm(newComment) {
    if (!newComment) return;
    Object.keys(newComment).forEach(id => {
        if (id in showComments) return;
        showComments[id] = newComment[id];
        let needCreateNewForm = true;
        divMask.querySelectorAll('.comments__form').forEach(form => {
            if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
                let parseComment = addMessage(showComments[id].message, showComments[id].timestamp);
                parseComment.dataset.commentId = showComments[id].id;
                let commentBody = form.querySelector('.comments__body');
                let commentsLoader = commentBody.querySelector('.comment .loader').parentNode;
                commentBody.insertBefore(parseComment, commentsLoader);
                let commentMarkerCheckbox = form.querySelector('.comments__marker-checkbox');
                let commentInput = form.querySelector('.comments__input');
                commentMarkerCheckbox.classList.remove('invisible');

                if (commentMarkerCheckbox.checked === true) {
                    document.querySelectorAll('.comments__marker-checkbox').forEach(marker => {
                        marker.checked = false;
                        commentMarkerCheckbox.checked = true;
                        commentMarkerCheckbox.parentElement.style.zIndex = '3';
                    });
                } else {
                    commentMarkerCheckbox.checked = false;
                    commentMarkerCheckbox.parentElement.style.zIndex = '2';
                };

                let commentClose = form.querySelector('.comments__close');
                commentClose.disabled = false;
                form.dataset.hasComments = 'true';
                needCreateNewForm = false;
                commentInput.value = '';
            };
        });
        if (needCreateNewForm) {
            let parseForm = createCommentForm(showComments[id].left, showComments[id].top);
            let parseComment = addMessage(showComments[id].message, showComments[id].timestamp);
            parseComment.dataset.commentId = newComment[id].id;
            let commentBody = parseForm.querySelector('.comments__body');
            let commentsLoader = commentBody.querySelector('.comment .loader').parentNode;
            commentBody.insertBefore(parseComment, commentsLoader);
            let commentMarkerCheckbox = parseForm.querySelector('.comments__marker-checkbox');
            let commentInput = parseForm.querySelector('.comments__input');
            commentMarkerCheckbox.classList.remove('invisible');

            if (commentMarkerCheckbox.checked === true) {
                document.querySelectorAll('.comments__marker-checkbox').forEach(marker => {
                    marker.checked = false;
                    commentMarkerCheckbox.checked = true;
                    commentMarkerCheckbox.parentElement.style.zIndex = '3';
                });
            } else {
                commentMarkerCheckbox.checked = false;
                commentMarkerCheckbox.parentElement.style.zIndex = '2';
            };
            commentMarkerCheckbox.checked = false;
            let commentClose = parseForm.querySelector('.comments__close');
            commentClose.disabled = false;
            parseForm.dataset.hasComments = 'true';
            commentInput.value = '';
            divMask.appendChild(parseForm);
        };
    });
};

function insertWssCommentForm(wssComment) {
    const wsCommentEdited = {};
    wsCommentEdited[wssComment.id] = {};
    wsCommentEdited[wssComment.id].left = wssComment.left;
    wsCommentEdited[wssComment.id].message = wssComment.message;
    wsCommentEdited[wssComment.id].timestamp = wssComment.timestamp;
    wsCommentEdited[wssComment.id].top = wssComment.top;
    updateCommentForm(wsCommentEdited);
};

// fix trouble --Transferring items to another line when changing screen sizes //

function tick() {
    if (menu.offsetHeight > 65) {
        let widthMode = 0;
        let widthTool;
        let widthBurg = parseInt(getComputedStyle(burger).width);
        let widthDrag = parseInt(getComputedStyle(drag).width);
        if(menu.dataset.state === 'default') {
            modeElements.forEach(el => {
                widthMode += parseInt(getComputedStyle(el).width);
            });
            menu.style.left = (app.offsetWidth - (widthDrag + widthMode)) - 5 + 'px';
        } else {
            modeElements.forEach(el => {
                if (el.dataset.state === 'selected') {
                    console.log(el);
                    widthMode = parseInt(getComputedStyle(el).width);
                };
            });
            toolsElements.forEach(el => {
                if (!el.classList.contains('tool')) {
                    console.log(el)
                    widthTool = parseInt(getComputedStyle(el).width);
                };
            });
            menu.style.left = (app.offsetWidth - (widthDrag + widthBurg + widthTool + widthMode)) - 5 + 'px';
        };     
    };
    window.requestAnimationFrame(tick);
};
tick();
