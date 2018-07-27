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
const commentsLoader = commentsForm.querySelector('.loader');
const error = app.querySelector('.error');
const errorHeader = error.querySelector('.error__header');
const errorMessage = error.querySelector('.error__message');
const modeElements = menu.querySelectorAll('.mode');
const toolsElements = menu.querySelectorAll('.tool');
const menuColor = menu.querySelectorAll('.menu__color');
const menuUrl = menu.querySelector('.menu__url');
const menuCopy = menu.querySelector('.menu_copy');
const imageLoader = app.querySelector('.image-loader');
const canvas = document.createElement('canvas');
canvas.style.position = 'absolute';
app.insertBefore(canvas, error);
const ctx = canvas.getContext('2d');
let divMask = document.createElement('div');
app.insertBefore(divMask, canvas);
divMask.style.position = 'absolute';
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
const colors = {
    'red': '#ea5d56',
    'yellow': '#f3d135',
    'green': '#6cbe47',
    'blue': '#53a7f5',
    'purple': '#b36ade'
};
let currentColor = 'green';
menu.style.left = app.offsetWidth / 2 - parseInt(getComputedStyle(menu).width) / 2 + 'px';
menu.style.top = app.offsetHeight / 2 - parseInt(getComputedStyle(menu).height) / 2 + 'px';
currentImage.src = '';
app.removeChild(commentsForm);

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

    drag.addEventListener('mouseup', () => {
        moveMenu = null;
        document.removeEventListener('mousemove', move);
    });
});
drag.addEventListener('dragstart', () => {
    return false;
});

////////////////////////////////   BURGER  /////////////////////////////////////

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
    error.style.display = '';
    errorMessage.innerText = text;
    setTimeout(() => {
        error.style.display = 'none';
    }, 4000)
}

currentImage.addEventListener('error', () => {
    checkImg = true;
});

function showFile(file) {
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
        let imgSrc = URL.createObjectURL(file);
        let formData = new FormData();
        formData.append('title', file.name);
        formData.append('image', file);
        let xhr = new XMLHttpRequest();
        xhr.addEventListener('loadstart', () => {
            imageLoader.style.display = '';
        });
        xhr.addEventListener('loadend', () => {
            imageLoader.style.display = 'none';
        });
        xhr.open('POST', 'https://neto-api.herokuapp.com/pic', true);
        xhr.addEventListener('load', () => {
            if (xhr.status == 200) {
                let imgData = JSON.parse(xhr.responseText);
                imgId = imgData.id;
                wss();
                currentImage.src = imgData.url;
                menuUrl.value = `${window.location.origin}${window.location.pathname}?id=${imgData.id}`;
                menuCopy.addEventListener('click', (event) => {
                    event.preventDefault();
                    menuUrl.select();
                    document.execCommand('copy');
                });
            }
        });
        xhr.send(formData);
        currentImage.addEventListener('load', () => {
            URL.revokeObjectURL(imgSrc);
            resizeCanvas();
            getMask();
            checkImg = false;
            menu.dataset.state = 'selected';
            share.dataset.state = 'selected';
            shareTools.classList.remove('tool');
        });
    } else {
        showError('Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.');
    }
};

app.addEventListener('drop', (event) => {
    event.preventDefault();
    let file = event.dataTransfer.files[0];
    if (checkImg) {
        showFile(file);
    } else {
        showError('Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом «Загрузить новое» в меню');
    }
});

app.addEventListener('dragover', (event) => {
    event.preventDefault()
});

let inputFile = document.createElement('input');
inputFile.type = 'file';
inputFile.style.position = 'absolute';
inputFile.style.top = '0';
inputFile.style.left = '0';
inputFile.style.position = 'absolute';
inputFile.style.width = getComputedStyle(newMode).width;
inputFile.style.height = getComputedStyle(newMode).height;
inputFile.style.opacity = '0';
inputFile.style.cursor = 'pointer';
inputFile.accept = 'image/png,image/jpeg';
newMode.appendChild(inputFile);
inputFile.addEventListener('change', (event) => {
    let file = event.target.files[0];
    showFile(file);
});

////////////////////////////////   DRAW   //////////////////////////////////////

function resizeCanvas() {
    imgStyle = getComputedStyle(currentImage);
    canvas.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    canvas.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    canvas.width = parseInt(imgStyle.width);
    canvas.height = parseInt(imgStyle.height);
}

window.addEventListener('resize', () => {
    canvas.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    canvas.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    divMask.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    divMask.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
});

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
            currentColor = event.target.value;
        });
    });
});

function circle(event) {
    if (isMouseDown) {
        const point = [event.layerX, event.layerY];
        ctx.fillStyle = colors[currentColor];
        ctx.lineWidth = 4;
        ctx.strokeStyle = colors[currentColor];
        ctx.lineTo(...point);
        ctx.stroke();
        ctx.arc(...point, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(...point);
        trottledSendMask();
    }
};

//////////////////////////////   COMMENTS   ////////////////////////////////////

function getMask() {
    imgStyle = getComputedStyle(currentImage);
    divMask.style.top = parseFloat(imgStyle.top) - parseFloat(imgStyle.height) / 2 + 'px';
    divMask.style.left = parseFloat(imgStyle.left) - parseFloat(imgStyle.width) / 2 + 'px';
    divMask.style.width = parseInt(imgStyle.width) + 'px';
    divMask.style.height = parseInt(imgStyle.height) + 'px';
};
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
            }
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
    let comment = document.createElement('div');
    comment.className = 'comment';
    let commentTime = document.createElement('p');
    commentTime.className = 'comment__time';
    commentTime.innerText = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    let commentMessage = document.createElement('p');
    commentMessage.className = 'comment__message';
    commentMessage.innerText = message;
    comment.appendChild(commentTime);
    comment.appendChild(commentMessage);
    return comment;
};

function createCommentForm(left, top) {
    let commentForm = document.createElement('form');
    commentForm.className = 'comments__form';
    let commentMarker = document.createElement('span');
    commentMarker.className = 'comments__marker';
    let commentMarkerCheckbox = document.createElement('input');
    commentMarkerCheckbox.className = 'comments__marker-checkbox';
    commentMarkerCheckbox.type = 'checkbox';
    commentMarkerCheckbox.checked = true;
    commentMarkerCheckbox.style.display = 'none';
    let commentBody = document.createElement('div');
    commentBody.className = 'comments__body';
    let commentsLoader = imageLoader.querySelector('.loader').cloneNode(true);
    let commentInput = document.createElement('textarea');
    commentInput.className = 'comments__input';
    // commentInput.type = 'text';
    commentInput.placeholder = 'Напишите ответ...';
    let commentClose = document.createElement('input');
    commentClose.className = 'comments__close';
    commentClose.type = 'button';
    commentClose.value = 'Закрыть';
    commentClose.disabled = true;
    let commentSubmit = document.createElement('input');
    commentSubmit.className = 'comments__submit';
    commentSubmit.type = 'submit';
    commentSubmit.value = 'Отправить';
    commentBody.appendChild(commentsLoader);
    commentsLoader.style.display = 'none';
    commentBody.appendChild(commentInput);
    commentBody.appendChild(commentClose);
    commentBody.appendChild(commentSubmit);
    commentForm.appendChild(commentMarker);
    commentForm.appendChild(commentMarkerCheckbox);
    commentForm.appendChild(commentBody);
    commentForm.style.display = '';
    commentForm.style.top = top + 'px';
    commentForm.style.left = left + 'px';
    commentForm.style.zIndex = '2';
    commentForm.dataset.leftTop = `${left};${top}`;
    commentForm.dataset.left = left;
    commentForm.dataset.top = top;
    commentForm.dataset.hasComments = 'false';
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
        }
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
            commentsLoader.style.display = '';
        });
        xhr.addEventListener('loadend', () => {
            commentsLoader.style.display = 'none';
        });
        xhr.send(app);
        commentMarkerCheckbox.checked = true;
    });
    return commentForm;
};

menuToggle.forEach((toggle) => {
    toggle.addEventListener('change', (event) => {
        if (event.target.value === 'on') {
            document.querySelectorAll('.comments__form').forEach(form => { form.style.display = '' });
        };
        if (event.target.value === 'off') {
            document.querySelectorAll('.comments__form').forEach(form => { form.style.display = 'none' });
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

////////////////////////////   FOLLOWING A LINK   //////////////////////////////

if (window.location.search) {
    menu.style.display = 'none';
    imageLoader.style.display = '';
    imgId = window.location.href.split('?id=')[1];
    let xhr = new XMLHttpRequest();
    xhr.open('get', `https://neto-api.herokuapp.com/pic/${imgId}`, true);
    xhr.send();
    xhr.addEventListener('load', () => {
        wss();
        let getData = JSON.parse(xhr.responseText);
        currentImage.src = getData.url;
        menuUrl.value = window.location.href;
        menu.style.display = '';
        imageLoader.style.display = 'none';
        menu.dataset.state = 'selected';
        comments.dataset.state = 'selected';
        commentsTools.classList.remove('tool');
        currentImage.addEventListener('load', () => {
            resizeCanvas();
            getMask();
            checkImg = false;
            menu.dataset.state = 'selected';
            comments.dataset.state = 'selected';
            commentsTools.classList.remove('tool');
            canvas.addEventListener('click', addCommentEvent);
            let parseComments = getData.comments;
            for (let key in parseComments) {
                let comment = parseComments[key];
                let parseForm;
                if (divMask.querySelector(`form[style="top: ${comment.top}px; left: ${comment.left}px; z-index: 2;"]`) !== null) {
                    parseForm = document.querySelector(`form[style="top: ${comment.top}px; left: ${comment.left}px; z-index: 2;"]`);
                } else {
                    parseForm = createCommentForm(comment.left, comment.top);
                    divMask.appendChild(parseForm);
                };
                let parseComment = addMessage(comment.message, comment.timestamp);
                parseComment.dataset.commentId = key;
                let commentBody = parseForm.querySelector('.comments__body');
                let commentsLoader = parseForm.querySelector('.loader');
                commentBody.insertBefore(parseComment, commentsLoader);
                let commentMarkerCheckbox = parseForm.querySelector('.comments__marker-checkbox');
                commentMarkerCheckbox.style.display = '';
                commentMarkerCheckbox.checked = false;
                let commentClose = parseForm.querySelector('.comments__close');
                commentClose.disabled = false;
                parseForm.dataset.hasComments = 'true';
            };
        });
    });

    xhr.addEventListener('loadstart', () => {
        menu.style.display = 'none';
        imageLoader.style.display = '';
    });
};

function tick() {
    if (menu.offsetHeight > 66) {
        menu.style.transitionDelay = '0s';
        menu.style.left = (app.offsetWidth - menu.offsetWidth) - 1 + 'px';
    };
    window.requestAnimationFrame(tick);
};
tick();

let connection;
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

window.onbeforeunload = function() {
    connection.onclose = function () {};
    connection.close();
};

function updateCommentForm(newComment) {
	if (!newComment) return;
	Object.keys(newComment).forEach(id => {
		if (id in showComments) return;
		showComments[id] = newComment[id];
		let needCreateNewForm = true;
		Array.from(divMask.querySelectorAll('.comments__form')).forEach(form => {
			if (+form.dataset.left === showComments[id].left && +form.dataset.top === showComments[id].top) {
                let parseComment = addMessage(showComments[id].message, showComments[id].timestamp);
                parseComment.dataset.commentId = showComments[id].id;
                let commentBody = form.querySelector('.comments__body');
                let commentsLoader = form.querySelector('.loader');
                commentBody.insertBefore(parseComment, commentsLoader);
                let commentMarkerCheckbox = form.querySelector('.comments__marker-checkbox');
                let commentInput = form.querySelector('.comments__input');
                commentMarkerCheckbox.style.display = '';
                if(commentMarkerCheckbox.checked) {
                    commentMarkerCheckbox.checked = true;
                } else {
                    commentMarkerCheckbox.checked = false
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
                let commentsLoader = parseForm.querySelector('.loader');
                commentBody.insertBefore(parseComment, commentsLoader);
                let commentMarkerCheckbox = parseForm.querySelector('.comments__marker-checkbox');
                let commentInput = parseForm.querySelector('.comments__input');
                commentMarkerCheckbox.style.display = '';
                if(commentMarkerCheckbox.checked) {
                    commentMarkerCheckbox.checked = true;
                } else {
                    commentMarkerCheckbox.checked = false
                };
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
