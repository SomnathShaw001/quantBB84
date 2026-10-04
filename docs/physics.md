# Theoretical Foundations of the BB84 Protocol

## 1. Introduction

The BB84 protocol, proposed by Charles H. Bennett and Gilles Brassard in 1984, constitutes the first quantum cryptographic protocol. It exploits the quantum mechanical principle of state disturbance under measurement and the No-Cloning Theorem to establish a shared secret cryptographic key between two parties, traditionally designated **Alice** (transmitter) and **Bob** (receiver), in the presence of an eavesdropper, **Eve**.

## 2. Mathematical Representation of Quantum States

The protocol employs two mutually unbiased bases (MUBs) in a two-dimensional Hilbert space $\mathcal{H}_2$:
1. **Computational / Rectilinear Basis ($Z$):**
   $$|0\rangle = \begin{pmatrix} 1 \\ 0 \end{pmatrix}, \quad |1\rangle = \begin{pmatrix} 0 \\ 1 \end{pmatrix}$$
2. **Diagonal / Hadamard Basis ($X$):**
   $$|+\rangle = \frac{|0\rangle + |1\rangle}{\sqrt{2}} = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ 1 \end{pmatrix}, \quad |-\rangle = \frac{|0\rangle - |1\rangle}{\sqrt{2}} = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 \\ -1 \end{pmatrix}$$

The transition amplitudes between basis elements satisfy the mutual unbiasedness condition:
$$|\langle \psi_Z | \phi_X \rangle|^2 = \frac{1}{2} \quad \forall \psi_Z \in \{|0\rangle, |1\rangle\}, \phi_X \in \{|+\rangle, |-\rangle\}$$

## 3. Quantum Bit Error Rate (QBER) Under Intercept-Resend Attack

Under an intercept-resend eavesdropping strategy, Eve intercepts Alice's photon, measures it in basis $e \in \{Z, X\}$, and prepares a new state in basis $e$ corresponding to her measurement outcome.

Let Alice transmit state $|\psi\rangle$ chosen uniformly from basis $a \in \{Z, X\}$, and let Bob measure in basis $b \in \{Z, X\}$.
During the public sifting phase, all instances where $a \neq b$ are discarded ($P(a = b) = 1/2$).

For the retained sifted instances ($a = b$):
1. **Eve selects matching basis ($e = a$):**
   $$P(e = a) = \frac{1}{2}$$
   In this case, Eve's measurement yields the exact bit encoded by Alice deterministically without disturbing the state. Bob measures with zero error:
   $$P(\text{error} \mid e = a, a = b) = 0$$

2. **Eve selects mismatched basis ($e \neq a$):**
   $$P(e \neq a) = \frac{1}{2}$$
   Eve's measurement projects Alice's state into the conjugate basis. When Eve re-prepares and forwards this state, Bob measures in basis $a = b$. By mutual unbiasedness:
   $$P(\text{error} \mid e \neq a, a = b) = |\langle 1 \mid + \rangle|^2 = \frac{1}{2}$$

Thus, the total conditional error probability for intercepted, basis-matched qubits is:
$$Q_{\text{intercept}} = P(e = a) \cdot 0 + P(e \neq a) \cdot \frac{1}{2} = \frac{1}{2} \cdot 0 + \frac{1}{2} \cdot \frac{1}{2} = \frac{1}{4} = 25\%$$

If Eve intercepts only a fraction $f \in [0, 1]$ of the transmitted qubits:
$$QBER(f) = 0.25 \cdot f$$

## 4. The Shor-Preskill Security Bound (11% Threshold)

The asymptotic secret key generation rate $R$ under one-way classical post-processing is governed by the Devetak-Winter and Csiszár-Körner theorems:
$$R \ge 1 - 2 h_2(Q)$$
where $h_2(p) = -p \log_2(p) - (1-p) \log_2(1-p)$ represents the binary Shannon entropy function.

Setting $R = 0$ yields the critical threshold:
$$h_2(Q_{\text{max}}) = 0.5 \implies Q_{\text{max}} \approx 11.0028\%$$

When the measured QBER on the test sample exceeds 11%, the mutual information between Alice and Bob $I(A:B)$ is insufficient to distill a secure key via privacy amplification, necessitating an immediate **ABORT**.
