const serverUrl = 'https://efalgja3c7cb.usemoralis.com:2053/server'; //Server url from moralis.io
const appId = 'yNvyEupnXFhJ1YiroxpraoqXLROweEv1BAcCoA2A'; // Application id from moralis.io

let currentTrade = {};
// currentSelectSide == current/to
let currentSelectSide;
let tokens;

// load all available tokens on load in background
async function init() {
  await Moralis.start({ serverUrl, appId });
  await Moralis.enableWeb3();
  await listAvailableTokens();
  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById('swap_button').disabled = false;
  }
}

async function listAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: 'eth',
  });
  tokens = result.tokens;
  let parent = document.getElementById('token_list');
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement('div');
    // embedd data-address attribute into each token-row div so can be accessed when token selected
    div.setAttribute('data-address', address);
    div.className = 'token_row';
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function selectToken(address) {
  closeModal();
  // all tokens loaded
  //   console.log(tokens);
  // global variable currentSelectSide == current/to
  // get data of selected token by referencing "address" as key in tokens object
  currentTrade[currentSelectSide] = tokens[address];
  //   console.log(currentTrade);
  //updating UI based on selected token data
  renderInterface();
  getQuote();
}

function renderInterface() {
  if (currentTrade.from) {
    document.getElementById('from_token_img').src = currentTrade.from.logoURI;
    document.getElementById('from_token_text').innerHTML =
      currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById('to_token_img').src = currentTrade.to.logoURI;
    document.getElementById('to_token_text').innerHTML = currentTrade.to.symbol;
  }
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.authenticate();
    }
    document.getElementById('swap_button').disabled = false;
  } catch (error) {
    console.log(error);
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById('token_modal').style.display = 'block';
}
function closeModal() {
  document.getElementById('token_modal').style.display = 'none';
}

async function getQuote() {
  if (
    !currentTrade.from ||
    !currentTrade.to ||
    !document.getElementById('from_amount').value
  )
    return;

  let amount = Number(
    document.getElementById('from_amount').value *
      10 ** currentTrade.from.decimals
  );

  // call Moralis API to get quote
  const quote = await Moralis.Plugins.oneInch.quote({
    chain: 'eth', 
    fromTokenAddress: currentTrade.from.address, 
    toTokenAddress: currentTrade.to.address, 
    amount: amount,
  });
//   console.log(quote);
  document.getElementById('gas_estimate').innerHTML = quote.estimatedGas;
  document.getElementById('to_amount').value =
    quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

async function trySwap() {
  let address = Moralis.User.current().get('ethAddress');
  let amount = Number(
    document.getElementById('from_amount').value *
      10 ** currentTrade.from.decimals
  );
  // check allowance (leftover balance from old trades)
  if (currentTrade.from.symbol !== 'ETH') {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentTrade.from.address, // The token you want to swap
      fromAddress: address, // Your wallet address
      amount: amount,
    });
    // console.log(allowance);
    // no allowance use approve method
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
      });
    }
  }
  try {
    let receipt = await doSwap(address, amount);
    alert('Swap Complete');
  } catch (error) {
    console.log(error);
  }
}

function doSwap(userAddress, amount) {
  return Moralis.Plugins.oneInch.swap({
    chain: 'eth', // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
    fromAddress: userAddress, // Your wallet address
    slippage: 1,
  });
}

init();

document.getElementById('modal_close').onclick = closeModal;
document.getElementById('from_token_select').onclick = () => {
  openModal('from');
};
document.getElementById('to_token_select').onclick = () => {
  openModal('to');
};
document.getElementById('login_button').onclick = login;
// on blur is when unselected
document.getElementById('from_amount').onblur = getQuote;
document.getElementById('swap_button').onclick = trySwap;
