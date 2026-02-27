import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Play, Clock, Trophy, CheckCircle2, XCircle } from 'lucide-react';

// === GitHub 圖片自動讀取設定 ===
const GITHUB_REPO = "tedus-ai/chiikawa-math";
const IMAGES_FOLDER_PATH = "public/images";

// --- 音效設定 (使用真實音檔) ---
const yahaAudio = new Audio('./yaha.mp3');
// 新增：收集完成的專屬語音
const yahayaAudio = new Audio('./yahaya.mp3');

const playYaha = () => {
  try {
    yahaAudio.currentTime = 0;
    yahaAudio.play().catch(e => console.log("等待使用者互動後才能播放音效:", e));
  } catch (e) {
    console.log("播放音效失敗", e);
  }
};

const playYahaya = () => {
  try {
    yahayaAudio.currentTime = 0;
    yahayaAudio.play().catch(e => console.log("等待使用者互動後才能播放音效:", e));
  } catch (e) {
    console.log("播放音效失敗", e);
  }
};

// --- 題庫生成邏輯 ---
const generateQuestion = () => {
  while (true) {
    let d = Math.floor(Math.random() * 8) + 2; 
    let isThreeDigit = Math.random() > 0.5;
    let D = isThreeDigit ? Math.floor(Math.random() * 900) + 100 : Math.floor(Math.random() * 90) + 10; 
    
    let r = D % d;
    if (r === 0) continue; 

    let strD = D.toString();
    let carryCount = 0;
    let current = 0;
    
    for(let i = 0; i < strD.length; i++) {
      current = current * 10 + parseInt(strD[i]);
      if (current >= d || i > 0) {
        let stepR = current % d;
        if (stepR !== 0 && i < strD.length - 1) carryCount++;
        current = stepR;
      }
    }

    if (carryCount > 0) {
      let steps = [];
      current = 0;
      let started = false;
      
      for (let i = 0; i < strD.length; i++) {
        current = current * 10 + parseInt(strD[i]);
        if (current >= d || started) {
          started = true;
          let qDigit = Math.floor(current / d);
          let sub = qDigit * d;
          let rem = current - sub;
          
          steps.push({
            index: i,
            currentValue: current,
            qDigit: qDigit,
            sub: sub,
            rem: rem,
            broughtDown: (i + 1 < strD.length) ? strD[i+1] : null,
          });
          current = rem;
        }
      }
      return { D, d, steps };
    }
  }
};

// --- 主應用程式元件 ---
export default function App() {
  const [gameState, setGameState] = useState('menu'); 
  const [settings, setSettings] = useState({ timeLimit: 60 });
  const [showSettings, setShowSettings] = useState(false);
  
  const [tempTimeLimit, setTempTimeLimit] = useState("60");
  
  const [totalPuddings, setTotalPuddings] = useState(0);
  const [question, setQuestion] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [wrongInput, setWrongInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const [imagesList, setImagesList] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);

  // 新增：控制吉伊卡哇圖片是否要「動起來」的狀態
  const [isHachiwareActive, setIsHachiwareActive] = useState(false);

  const timerRef = useRef(null);

  const startGame = () => {
    setGameState('playing');
    nextQuestion();
  };

  const nextQuestion = useCallback(() => {
    setQuestion(generateQuestion());
    setCurrentStep(0);
    setTimeLeft(settings.timeLimit);
    setWrongInput(false);
  }, [settings.timeLimit]);

  useEffect(() => {
    if (gameState === 'playing' && !showLevelUp) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            nextQuestion();
            return settings.timeLimit;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, showLevelUp, nextQuestion, settings.timeLimit]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${IMAGES_FOLDER_PATH}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const validImages = data.filter(file => file.type === 'file' && file.name.match(/\.(jpg|jpeg|png|gif)$/i));
          
          if (validImages.length > 0) {
            setImagesList(validImages);
            const randomImg = validImages[Math.floor(Math.random() * validImages.length)];
            setCurrentImage(randomImg);
          }
        }
      } catch (error) {
        console.error("無法自動讀取 GitHub 圖片:", error);
      }
    };

    fetchImages();
  }, []);

  const handleInput = (e) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) return;

    const expectedQ = question.steps[currentStep].qDigit;
    
    if (val === expectedQ) {
      playYaha();
      setWrongInput(false);
      
      // 觸發右側吉伊卡哇動畫，維持 2 秒
      setIsHachiwareActive(true);
      setTimeout(() => setIsHachiwareActive(false), 2000);
      
      if (currentStep === question.steps.length - 1) {
        const newPuddings = totalPuddings + 1;
        setTotalPuddings(newPuddings);
        setCurrentStep(currentStep + 1);
        
        if (newPuddings > 0 && newPuddings % 15 === 0) {
          playYahaya(); // 播放收集完成的專屬音效
          setTimeout(() => setShowLevelUp(true), 1000);
        } else {
          setTimeout(nextQuestion, 1500);
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setWrongInput(true);
      setTimeout(() => setWrongInput(false), 500);
    }
  };

  const currentAlbumIndex = Math.floor(totalPuddings / 15) + 1;
  const progressInAlbum = totalPuddings % 15;
  const piecesUnlocked = Math.floor(progressInAlbum / 5);

  return (
    <div className="min-h-screen bg-[#FFFBF0] font-sans text-gray-800 flex flex-col items-center py-8 relative overflow-x-hidden">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
      `}</style>

      <div className="w-full max-w-5xl px-6 flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-yellow-600 flex items-center gap-2">
          <Trophy className="text-yellow-500" /> 除法特訓班
        </h1>
        <button 
          onClick={() => {
            setTempTimeLimit(settings.timeLimit.toString());
            setShowSettings(true);
          }}
          className="p-2 rounded-full hover:bg-yellow-100 text-yellow-600 transition"
        >
          <Settings size={28} />
        </button>
      </div>

      {gameState === 'playing' ? (
        <div className="w-full max-w-5xl px-4 flex flex-col md:flex-row gap-6 items-start justify-center">
          
          {/* 左側：直式計算區 */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-yellow-200 flex-1 w-full max-w-md shrink-0">
            <div className="flex justify-between items-center mb-6 bg-yellow-50 p-3 rounded-xl">
              <div className="flex items-center gap-2 text-yellow-600 font-bold text-lg">
                <Clock size={20} />
                <span>{timeLeft} 秒</span>
              </div>
              <div className="w-1/2 bg-gray-200 h-3 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-400' : 'bg-yellow-400'}`}
                  style={{ width: `${(timeLeft / settings.timeLimit) * 100}%` }}
                />
              </div>
            </div>

            {question && (
              <div className="flex justify-center my-10 text-2xl font-mono leading-none">
                <div 
                  className="grid gap-y-2 relative" 
                  style={{ gridTemplateColumns: `repeat(${question.D.toString().length + 2}, 2rem)` }}
                >
                  <div 
                    style={{ gridRow: 1, gridColumn: `3 / ${3 + question.D.toString().length}` }} 
                    className="border-b-4 border-gray-700 h-full translate-y-[0.6rem] z-0"
                  />

                  {question.steps.map((step, i) => {
                    const col = 3 + step.index;
                    if (i < currentStep) {
                      return <div key={`q-${i}`} style={{gridRow: 1, gridColumn: col}} className="text-center font-bold text-blue-500 z-10">{step.qDigit}</div>;
                    } else if (i === currentStep) {
                      return (
                        <div key={`q-in-${i}`} style={{gridRow: 1, gridColumn: col}} className="flex justify-center z-10 -mt-1">
                          <input 
                            type="number" autoFocus maxLength={1} onChange={handleInput} value=""
                            className={`w-8 h-10 text-center border-b-4 bg-yellow-50 text-blue-600 font-bold outline-none rounded-t-md
                              ${wrongInput ? 'border-red-500 animate-shake text-red-500 bg-red-50' : 'border-blue-400'}`} 
                          />
                        </div>
                      );
                    }
                    return null;
                  })}

                  <div style={{gridRow: 2, gridColumn: 1}} className="text-right pr-2 font-bold mt-2">{question.d}</div>
                  <div style={{gridRow: 2, gridColumn: 2}} className="text-center font-bold text-gray-400 mt-2">)</div>
                  {question.D.toString().split('').map((char, i) => (
                    <div key={`D-${i}`} style={{gridRow: 2, gridColumn: 3 + i}} className="text-center font-bold mt-2">{char}</div>
                  ))}

                  {question.steps.map((step, i) => {
                    if (i < currentStep || (i === currentStep && currentStep === question.steps.length)) {
                      const rSub = 3 + i * 3;
                      const rLine = 4 + i * 3;
                      const rRem = 5 + i * 3;
                      const subStr = step.sub.toString();
                      const remStr = step.rem.toString();
                      
                      const alignCol = 3 + step.index;
                      const startCol = alignCol - subStr.length + 1;

                      return (
                        <React.Fragment key={`step-${i}`}>
                          <div style={{gridRow: rSub, gridColumn: startCol - 1}} className="text-center font-bold text-gray-400 mt-1">-</div>
                          {subStr.split('').map((char, j) => (
                            <div key={`sub-${i}-${j}`} style={{gridRow: rSub, gridColumn: startCol + j}} className="text-center text-gray-600 mt-1">{char}</div>
                          ))}
                          <div 
                            style={{gridRow: rLine, gridColumn: `${startCol - 1} / ${alignCol + (step.broughtDown ? 2 : 1)}`}} 
                            className="border-b-2 border-gray-400 my-1" 
                          />
                          {remStr.split('').map((char, j) => (
                            <div key={`rem-${i}-${j}`} style={{gridRow: rRem, gridColumn: alignCol - remStr.length + 1 + j}} className="text-center font-bold mt-1">
                              {i === question.steps.length - 1 ? <span className="text-red-500 bg-red-50 px-1 rounded">{char}</span> : char}
                            </div>
                          ))}
                          {step.broughtDown && (
                            <div style={{gridRow: rRem, gridColumn: alignCol + 1}} className="text-center font-bold text-green-600 mt-1">
                              {step.broughtDown}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            
            <div className="text-center text-sm text-gray-500 mt-6 bg-gray-50 p-3 rounded-lg">
              💡 提示：請在上方藍色框格內輸入正確的「商」，系統會自動幫你計算減法喔！
            </div>
          </div>

          {/* 右側組合：畫廊 + 會動的角色 */}
          <div className="flex flex-col sm:flex-row items-end gap-6 w-full max-w-lg">
            
            {/* 畫廊區塊 */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-pink-200 flex flex-col items-center w-full max-w-[16rem] shrink-0">
              <h2 className="text-xl font-bold text-pink-500 mb-4 flex items-center gap-2">
                <span role="img" aria-label="pudding">🍮</span> 我的布丁收集
              </h2>
              
              <div className="flex gap-2 text-2xl font-bold text-orange-500 mb-6 bg-orange-50 px-6 py-2 rounded-full border border-orange-200">
                {totalPuddings} <span className="text-gray-500 text-lg self-end mb-1">個</span>
              </div>

              <p className="text-sm font-bold text-gray-600 mb-2">相簿 {currentAlbumIndex}</p>
              
              <div className="w-48 h-48 relative overflow-hidden rounded-xl shadow-inner border-4 border-gray-100 bg-gray-50 flex items-center justify-center">
                {!currentImage && <div className="text-gray-400 font-bold animate-pulse text-sm">連線讀取圖片中...</div>}
                
                {currentImage && (
                  <img 
                    src={`${currentImage.download_url}?v=${currentImage.sha}`} 
                    alt="獎勵圖片" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                
                <div className="absolute inset-0 flex">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className={`flex-1 bg-pink-300 border-r border-pink-400 border-dashed last:border-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out
                        ${piecesUnlocked > i ? 'opacity-0' : 'opacity-100'}`}
                    >
                      <div className="bg-white/50 rounded-full p-1 backdrop-blur-sm">
                        <span className="text-lg">❓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 font-medium text-center">
                再獲得 <span className="text-pink-500 font-bold">{5 - (progressInAlbum % 5)}</span> 個布丁<br/>可解鎖下一塊！
              </div>
            </div>

            {/* 新增：畫廊右側的動態角色區塊 */}
            <div className="w-28 h-32 flex-shrink-0 flex items-end justify-center mb-4 relative">
              <img 
                /* 如果是觸發狀態就顯示動畫 gif，否則顯示靜止的 png */
                src={isHachiwareActive ? './hachiware_think.gif' : './hachiware_idle.png'} 
                alt="吉伊卡哇夥伴" 
                className={`w-full object-contain transition-all duration-300 origin-bottom
                  ${isHachiwareActive ? 'animate-bounce scale-110' : 'scale-100 opacity-90'}
                `}
                onError={(e) => {
                  // 防呆機制：如果家長沒有放 idle.png，則退回顯示原本的 gif，但利用 css 灰階讓它看起來像靜止
                  if (e.target.src.includes('idle.png')) {
                    e.target.src = './hachiware_think.gif';
                    e.target.style.filter = 'grayscale(80%) contrast(80%)';
                  } else {
                    e.target.style.filter = 'none';
                  }
                }}
              />
            </div>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center border-8 border-yellow-300 max-w-lg">
            <div className="text-6xl mb-6">🍮</div>
            <h2 className="text-4xl font-extrabold text-yellow-600 mb-4 tracking-wider">除法大挑戰</h2>
            <p className="text-gray-600 mb-10 text-lg font-medium leading-relaxed">
              挑戰帶有餘數的退位除法！<br/>每答對一題就能獲得布丁，<br/>收集布丁來解鎖可愛的圖片吧！
            </p>
            <button 
              onClick={startGame}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-2xl font-bold text-white bg-pink-500 rounded-full overflow-hidden hover:bg-pink-400 transition transform hover:scale-105 shadow-[0_8px_0_rgb(219,39,119)] hover:shadow-[0_4px_0_rgb(219,39,119)] hover:translate-y-1 active:shadow-none active:translate-y-2"
            >
              <span className="mr-2">開始特訓</span>
              <Play fill="currentColor" size={24} className="group-hover:animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* 設定 Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-96 relative border-4 border-gray-100">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition"
            >
              <XCircle size={32} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="text-gray-500"/> 家長管理設定
            </h3>
            
            <div className="mb-8">
              <label className="block text-gray-700 font-bold mb-3 text-lg">
                每題作答時間 (秒)
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={tempTimeLimit}
                  onChange={(e) => {
                    setTempTimeLimit(e.target.value.replace(/\D/g, ''));
                  }}
                  className="w-24 border-2 border-gray-300 p-3 rounded-xl text-center text-xl font-bold focus:border-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-200 transition"
                />
                <span className="text-gray-500 font-medium">秒</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                let finalTime = parseInt(tempTimeLimit, 10);
                if (isNaN(finalTime) || finalTime < 1) finalTime = 10;
                
                setSettings({...settings, timeLimit: finalTime});
                setShowSettings(false);
                if (gameState === 'playing') setTimeLeft(finalTime);
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl text-lg transition shadow-[0_6px_0_rgb(37,99,235)] active:shadow-none active:translate-y-[6px]"
            >
              儲存設定
            </button>
          </div>
        </div>
      )}

      {/* 解鎖圖片 Modal */}
      {showLevelUp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl text-center border-8 border-pink-400 max-w-md w-full animate-bounce">
            <h2 className="text-4xl font-extrabold text-pink-500 mb-2">太棒了！</h2>
            <p className="text-xl text-pink-400 font-bold mb-6">解鎖了一張完整的相片！</p>
            
            <div className="w-full aspect-square relative rounded-2xl overflow-hidden shadow-inner mb-8 border-4 border-gray-100 flex items-center justify-center bg-gray-50">
               {currentImage && (
                 <img 
                    src={`${currentImage.download_url}?v=${currentImage.sha}`} 
                    alt="解鎖圖片" 
                    className="w-full h-full object-cover"
                  />
               )}
            </div>

            <button 
              onClick={() => {
                setShowLevelUp(false);
                
                if (imagesList.length > 0) {
                  let nextImage;
                  if (imagesList.length > 1) {
                    do {
                      nextImage = imagesList[Math.floor(Math.random() * imagesList.length)];
                    } while (nextImage.name === currentImage?.name);
                  } else {
                    nextImage = imagesList[0];
                  }
                  setCurrentImage(nextImage);
                }
                
                nextQuestion();
              }}
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-bold py-4 px-10 rounded-full text-xl transition shadow-[0_6px_0_rgb(202,138,4)] active:shadow-none active:translate-y-[6px] flex items-center justify-center gap-2 mx-auto w-full"
            >
              <CheckCircle2 /> 繼續收集
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
